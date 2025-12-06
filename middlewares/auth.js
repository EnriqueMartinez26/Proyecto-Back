const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
    try {
        let token;

        // 1. Prioridad: Token en Cookie (HttpOnly - Más seguro contra XSS)
        if (req.cookies.token) {
            token = req.cookies.token;
        }
        // 2. Fallback: Header Authorization (Bearer)
        else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token || token === 'none') {
            return res.status(401).json({
                success: false,
                message: 'Sesión expirada o no válida'
            });
        }

        // SEGURIDAD CRÍTICA: Fallar si no hay secreto configurado
        if (!process.env.JWT_SECRET) {
            console.error("FATAL: JWT_SECRET no definido en variables de entorno.");
            return res.status(500).json({ success: false, message: 'Error de configuración del servidor' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password');

        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Usuario no encontrado' });
        }

        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
    }
};

exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Acceso denegado: Se requiere rol ${roles.join(' o ')}`
            });
        }
        next();
    };
};