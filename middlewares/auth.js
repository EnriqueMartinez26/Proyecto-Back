const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Proteger rutas
exports.protect = async (req, res, next) => {
    try {
        let token;

        // Verificar si el token existe en los headers
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        // Verificar si el token fue proporcionado
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No autorizado, token no proporcionado'
            });
        }

        // Verificar y decodificar token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

        // Buscar usuario
        req.user = await User.findById(decoded.id).select('-password');

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        next();
    } catch (error) {
        console.error('Error en middleware de autenticación:', error);
        res.status(401).json({
            success: false,
            message: 'No autorizado, token inválido',
            error: error.message
        });
    }
};

// Autorización por rol
exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `El rol ${req.user.role} no tiene permiso para acceder a este recurso`
            });
        }
        next();
    };
};