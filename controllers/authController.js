const AuthService = require('../services/authService');
const UserService = require('../services/userService');

// Helper para gestionar la cookie y respuesta del token
const sendTokenResponse = (user, statusCode, res) => {
    const token = user.getSignedJwtToken();

    const options = {
        expires: new Date(Date.now() + (process.env.JWT_COOKIE_EXPIRE || 30) * 24 * 60 * 60 * 1000),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax'
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
                role: user.role,
                avatar: user.avatar || null,
                phone: user.phone || null,
                address: user.address || null
            }
        });
};

// @desc    Registrar usuario
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
    try {
        const user = await AuthService.register(req.body);
        sendTokenResponse(user, 201, res);
    } catch (error) {
        next(error);
    }
};

// @desc    Verificar email
// @route   GET /api/auth/verify
// @access  Public
exports.verifyEmail = async (req, res, next) => {
    try {
        const { token } = req.query;
        if (!token) {
            const error = new Error('Token no proporcionado');
            error.statusCode = 400;
            throw error;
        }

        await AuthService.verifyEmail(token);

        res.status(200).json({
            success: true,
            message: 'Email verificado exitosamente. Ya puedes iniciar sesión.'
        });
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
        const user = await AuthService.login(email, password);
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
        const user = await UserService.getUserById(req.user.id);
        res.status(200).json({
            success: true,
            user: {
                id: user._id || user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: user.avatar || null,
                phone: user.phone || null,
                address: user.address || null,
                isVerified: user.isVerified,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Actualizar perfil propio (nombre, avatar, teléfono, dirección)
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
    try {
        const { name, avatar, phone, address } = req.body;
        const user = await UserService.getUserById(req.user.id);

        if (name !== undefined) user.name = name;
        if (avatar !== undefined) user.avatar = avatar;
        if (phone !== undefined) user.phone = phone;
        if (address !== undefined) user.address = address;

        await user.save();

        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: user.avatar || null,
                phone: user.phone || null,
                address: user.address || null,
                isVerified: user.isVerified,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Cambiar contraseña
// @route   PUT /api/auth/password
// @access  Private
exports.changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            const error = new Error('Se requiere la contraseña actual y la nueva.');
            error.statusCode = 400;
            throw error;
        }

        if (newPassword.length < 6) {
            const error = new Error('La nueva contraseña debe tener al menos 6 caracteres.');
            error.statusCode = 400;
            throw error;
        }

        // Necesitamos el password para comparar
        const User = require('../models/User');
        const user = await User.findById(req.user.id).select('+password');

        if (!user) {
            const error = new Error('Usuario no encontrado');
            error.statusCode = 404;
            throw error;
        }

        const isMatch = await user.matchPassword(currentPassword);
        if (!isMatch) {
            const error = new Error('La contraseña actual es incorrecta.');
            error.statusCode = 401;
            throw error;
        }

        user.password = newPassword;
        await user.save(); // El pre-save hook encripta automáticamente

        res.status(200).json({
            success: true,
            message: 'Contraseña actualizada correctamente.'
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
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax'
    });

    res.status(200).json({
        success: true,
        data: {}
    });
};
