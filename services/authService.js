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

        // Envío de email ASÍNCRONO (Fire & Forget)
        // Evitamos bloquear la respuesta por timeouts en SMTP
        logger.info(`[AuthService] Iniciando proceso de envío de email de bienvenida a: ${email}`);

        emailService.sendWelcomeEmail({ name, email })
            .then(result => {
                if (result.success) {
                    logger.info('✅ Email de bienvenida enviado EXITOSAMENTE', { email, messageId: result.messageId });
                } else {
                    logger.error('❌ FALLÓ envío de email de bienvenida', { email, reason: result.message });
                }
            })
            .catch(error => {
                logger.error('🔥 EXCEPCIÓN al enviar email de bienvenida', { email, error: error.message, stack: error.stack });
            });

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
