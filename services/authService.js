const User = require('../models/User');
const emailService = require('../services/emailService');
const ErrorResponse = require('../utils/errorResponse');
const logger = require('../utils/logger');
const crypto = require('crypto');

class AuthService {
    // Registrar un nuevo usuario
    async register({ name, email, password }) {
        const userExists = await User.findOne({ email });

        if (userExists) {
            throw new ErrorResponse('El usuario ya existe', 400);
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

        // Fire-and-forget: no bloquear la respuesta HTTP esperando al SMTP.
        // El email se envía en background; si falla, se loguea pero el registro no se traba.
        // emailSent refleja el resultado real una vez que la promesa resuelve en el mismo tick.
        let emailSent = false;
        const emailPromise = emailService.sendWelcomeEmail({ name, email, verificationToken })
            .then(result => {
                emailSent = result.success;
                if (result.success) {
                    logger.info('Email de bienvenida enviado', { email, messageId: result.messageId });
                } else {
                    logger.warn('Falló envío de email de bienvenida (reenvío disponible vía /resend-verification)', { email, reason: result.message });
                }
            })
            .catch(error => {
                emailSent = false;
                logger.error('Excepción al enviar email de bienvenida', { email, error: error.message });
            });

        // Esperar hasta 4 s para obtener el resultado real sin bloquear demasiado.
        // 4 s cubre el cold start del pool SMTP (DNS + handshake TLS ~2-3 s en Render).
        // Si el SMTP tarda más, el registro igual responde 201 y emailSent queda false (honesto).
        await Promise.race([emailPromise, new Promise(r => setTimeout(r, 4000))]);

        return { user, emailSent };
    }

    // Verificar email
    async verifyEmail(token) {
        const user = await User.findOne({
            verificationToken: token,
            verificationTokenExpire: { $gt: Date.now() }
        });

        if (!user) {
            throw new ErrorResponse('Token de verificación inválido o expirado', 400);
        }

        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpire = undefined;
        await user.save();

        return user;
    }

    // Reenviar email de verificación
    async resendVerification(email) {
        const user = await User.findOne({ email });

        if (!user) {
            throw new ErrorResponse('No se encontró una cuenta con ese email', 404);
        }

        if (user.isVerified) {
            throw new ErrorResponse('Esta cuenta ya está verificada', 400);
        }

        // Generar nuevo token
        const verificationToken = crypto.randomBytes(20).toString('hex');
        user.verificationToken = verificationToken;
        user.verificationTokenExpire = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await user.save();

        const result = await emailService.sendWelcomeEmail({
            name: user.name,
            email: user.email,
            verificationToken
        });

        if (!result.success) {
            throw new ErrorResponse('No se pudo enviar el email de verificación. Intentá más tarde.', 503);
        }

        return { message: 'Email de verificación reenviado exitosamente' };
    }

    // Iniciar sesión
    async login(email, password) {
        if (!email || !password) {
            throw new ErrorResponse('Por favor ingrese email y contraseña', 400);
        }

        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            throw new ErrorResponse('Credenciales inválidas', 401);
        }

        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            throw new ErrorResponse('Credenciales inválidas', 401);
        }

        return user;
    }
}

module.exports = new AuthService();
