const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
    try {
        let token;

        // 1. Buscar token en Cookies (Prioridad)
        if (req.cookies.token) {
            token = req.cookies.token;
        }
        // 2. Fallback: Buscar en Header (para pruebas con Postman si se requiere)
        else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token || token === 'none') {
            return res.status(401).json({
                success: false,
                message: 'No autorizado, inicie sesión'
            });
        }

        // Verificar token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

        req.user = await User.findById(decoded.id).select('-password');

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        next();
    } catch (error) {
        console.error('Auth Middleware Error:', error.message);
        res.status(401).json({
            success: false,
            message: 'No autorizado, token inválido'
        });
    }
};

exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `El rol ${req.user.role} no tiene permiso`
            });
        }
        next();
    };
};