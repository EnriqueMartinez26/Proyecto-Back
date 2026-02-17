const User = require('../models/User');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');

class AuthService {
    // Registrar un nuevo usuario
    async register({ name, email, password }) {
        const userExists = await User.findOne({ email });

        if (userExists) {
            const error = new Error('El usuario ya existe');
            error.statusCode = 400;
            throw error;
        }

        const user = await User.create({
            name,
            email,
            password
        });

        // Envío de email con await para asegurar que el proceso se ejecute
        // Si falla, no revertimos el registro pero logueamos el error
        let emailSent = false;
        try {
            const result = await emailService.sendWelcomeEmail({ name, email });
            if (result.success) {
                logger.info('Email de bienvenida enviado', { email, messageId: result.messageId });
                emailSent = true;
            } else {
                logger.warn('Email de bienvenida no enviado (servicio reportó fallo)', { email, reason: result.message });
            }
        } catch (error) {
            logger.error('Excepción al enviar email de bienvenida', { email, error: error.message });
        }

        // Retornamos el usuario y el estado del email
        // Mongoose document to object para poder agregar propiedades
        const userObj = user.toObject();
        userObj.emailSent = emailSent;

        return userObj;
    }

    // Iniciar sesión
    async login(email, password) {
        if (!email || !password) {
            const error = new Error('Por favor ingrese email y contraseña');
            error.statusCode = 400;
            throw error;
        }

        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            const error = new Error('Credenciales inválidas');
            error.statusCode = 401;
            throw error;
        }

        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            const error = new Error('Credenciales inválidas');
            error.statusCode = 401;
            throw error;
        }

        return user;
    }
}

module.exports = new AuthService();
