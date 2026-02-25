const User = require('../models/User');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');
const crypto = require('crypto');

class AuthService {
    // Registrar un nuevo usuario
    async register({ name, email, password }) {
        const userExists = await User.findOne({ email });

        if (userExists) {
            const error = new Error('El usuario ya existe');
            error.statusCode = 400;
            throw error;
        }

        // Generar token de verificación
        const verificationToken = crypto.randomBytes(20).toString('hex');

        const user = await User.create({
            name,
            email,
            password,
            verificationToken,
            verificationTokenExpire: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            isVerified: false
        });

        logger.info(`[AuthService] Iniciando proceso de envío de email de bienvenida a: ${email}`);
        // Fire-and-forget — NO bloqueamos la respuesta HTTP con el email
        emailService.sendWelcomeEmail({ name, email, verificationToken })
            .then(result => {
                if (result.success) {
                    logger.info('✅ Email de bienvenida enviado', { email, messageId: result.messageId });
                } else {
                    logger.error('❌ FALLÓ envío de email', { email, reason: result.message });
                }
            })
            .catch(error => {
                logger.error('🔥 EXCEPCIÓN al enviar email', { email, error: error.message });
            });

        // La respuesta al usuario se envía INMEDIATAMENTE después de crear la cuenta
        return user;
    }

    // Verificar email
    async verifyEmail(token) {
        const user = await User.findOne({
            verificationToken: token,
            verificationTokenExpire: { $gt: Date.now() }
        });

        if (!user) {
            const error = new Error('Token de verificación inválido o expirado');
            error.statusCode = 400;
            throw error;
        }

        user.isVerified = true;
        user.verificationToken = undefined;
        await user.save();

        return user;
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
