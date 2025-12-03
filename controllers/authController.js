const User = require('../models/User');
const bcrypt = require('bcryptjs');
const AuthService = require('../services/authService');

// Helper para enviar respuesta con Cookie
const sendTokenResponse = (user, statusCode, res) => {
    const token = AuthService.generateToken(user._id);

    const options = {
        expires: new Date(
            Date.now() + (process.env.JWT_COOKIE_EXPIRE || 30) * 24 * 60 * 60 * 1000
        ),
        httpOnly: true, // Seguridad contra XSS
        secure: process.env.NODE_ENV === 'production', // Solo HTTPS en prod
        sameSite: 'strict' // Protección CSRF básica
    };

    res.status(statusCode)
        .cookie('token', token, options)
        .json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
};

exports.register = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        // Validaciones básicas
        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: 'Faltan datos requeridos' });
        }

        // Lógica de negocio vía servicio (verificación existencia)
        await AuthService.register({ name, email, password });

        // Hash manual (como tenías antes)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({
            name,
            email,
            password: hashedPassword
        });

        sendTokenResponse(user, 201, res);
    } catch (error) {
        // Si es error de negocio (ej. email duplicado), enviamos 400
        if (error.message === 'El email ya está registrado') {
             return res.status(400).json({ success: false, message: error.message });
        }
        next(error);
    }
};

exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Faltan credenciales' });
        }

        // Obtener usuario con password
        const user = await AuthService.login(email, password);

        // Verificar password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
        }

        sendTokenResponse(user, 200, res);
    } catch (error) {
        if (error.message === 'Credenciales inválidas') {
            return res.status(401).json({ success: false, message: error.message });
        }
        next(error);
    }
};

exports.getProfile = async (req, res) => {
    try {
        // req.user ya viene del middleware protect
        const user = await User.findById(req.user.id);
        
        res.json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error servidor' });
    }
};

exports.logout = async (req, res) => {
    // Limpiar cookie
    res.cookie('token', 'none', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    });

    res.json({ success: true, message: 'Sesión cerrada exitosamente' });
};