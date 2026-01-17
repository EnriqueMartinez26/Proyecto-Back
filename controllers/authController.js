const User = require('../models/User');
const bcrypt = require('bcryptjs');
const AuthService = require('../services/authService');

const sendTokenResponse = (user, statusCode, res) => {
    const token = AuthService.generateToken(user._id);

    // Configuración de Cookie adaptativa
    const isProduction = process.env.NODE_ENV === 'production';

    const options = {
        expires: new Date(Date.now() + (process.env.JWT_COOKIE_EXPIRE || 30) * 24 * 60 * 60 * 1000),
        httpOnly: true,
        // En desarrollo (IPs locales), secure debe ser false y sameSite 'lax' o 'none' (pero 'none' requiere secure)
        // Para máxima compatibilidad local usamos 'lax' y secure false.
        secure: isProduction,
        sameSite: isProduction ? 'strict' : 'lax'
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
        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: 'Faltan datos requeridos' });
        }

        // Logic moved to Service
        const user = await AuthService.register({ name, email, password });

        sendTokenResponse(user, 201, res);
    } catch (error) {
        // Generic error handling is now partly in service, but we catch others here
        if (error.message === 'Credenciales inválidas') {
            return res.status(400).json({ success: false, message: 'Credenciales inválidas' });
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
        const user = await AuthService.login(email, password);
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
    res.cookie('token', 'none', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    });
    res.json({ success: true, message: 'Sesión cerrada exitosamente' });
};
