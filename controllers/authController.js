const User = require('../models/User');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');

// Obtener token del modelo, crear cookie y enviar respuesta
const sendTokenResponse = (user, statusCode, res) => {
    // Generar token usando método del modelo
    const token = user.getSignedJwtToken();

    const options = {
        expires: new Date(Date.now() + (process.env.JWT_COOKIE_EXPIRE || 30) * 24 * 60 * 60 * 1000),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
    };

    res.status(statusCode)
        .cookie('token', token, options)
        .json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
};

// @desc    Registrar usuario
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ success: false, message: 'El usuario ya existe' });
        }

        // Crear usuario (el middleware pre-save en el modelo encriptará la contraseña)
        const user = await User.create({
            name,
            email,
            password
        });

        // Enviar email de bienvenida de forma asíncrona (no bloqueante)
        emailService.sendWelcomeEmail({ name, email })
            .then(result => {
                if (result.success) {
                    logger.info('Email de bienvenida enviado', { email, messageId: result.messageId });
                } else {
                    logger.warn('Email de bienvenida no enviado', { email, reason: result.message });
                }
            })
            .catch(error => {
                logger.error('Error al enviar email de bienvenida', { email, error: error.message });
            });

        sendTokenResponse(user, 201, res);
    } catch (error) {
        next(error);
    }
};

// @desc    Login usuario
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Validar email y contraseña
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Por favor ingrese email y contraseña' });
        }

        // Verificar usuario
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
        }

        // Verificar contraseña
        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
        }

        sendTokenResponse(user, 200, res);
    } catch (error) {
        next(error);
    }
};

// @desc    Obtener perfil de usuario
// @route   GET /api/auth/profile
// @access  Private
exports.getProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Cerrar sesión / Limpiar cookie
// @route   GET /api/auth/logout
// @access  Public
exports.logout = async (req, res, next) => {
    res.cookie('token', 'none', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    });

    res.status(200).json({
        success: true,
        data: {}
    });
};

