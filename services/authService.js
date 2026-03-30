const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const emailService = require('./emailService');
const ErrorResponse = require('../utils/errorResponse');
const logger = require('../utils/logger');
const crypto = require('crypto');

// Helper: hash a password
const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
};

// Helper: generate JWT
const signToken = (userId) =>
    jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '7d'
    });

// Helper: compare passwords
const matchPassword = (entered, hashed) => bcrypt.compare(entered, hashed);

class AuthService {
    async register({ name, email, password }) {
        const userExists = await prisma.user.findUnique({ where: { email } });
        if (userExists) throw new ErrorResponse('El usuario ya existe', 400);

        const verificationToken = crypto.randomBytes(20).toString('hex');
        const hashedPwd = await hashPassword(password);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPwd,
                verificationToken,
                verificationTokenExp: new Date(Date.now() + 24 * 60 * 60 * 1000),
                isVerified: false
            }
        });

        let emailSent = false;
        const emailPromise = emailService.sendWelcomeEmail({ name, email, verificationToken })
            .then(result => {
                emailSent = result.success;
                if (result.success) {
                    logger.info('Email de bienvenida enviado', { email });
                } else {
                    logger.warn('Falló envío de email de bienvenida', { email, reason: result.message });
                }
            })
            .catch(error => {
                emailSent = false;
                logger.error('Excepción al enviar email de bienvenida', { email, error: error.message });
            });

        await Promise.race([emailPromise, new Promise(r => setTimeout(r, 4000))]);
        return { user: { ...user, _id: user.id }, emailSent };
    }

    async verifyEmail(token) {
        const user = await prisma.user.findFirst({
            where: {
                verificationToken: token,
                verificationTokenExp: { gt: new Date() }
            }
        });

        if (!user) throw new ErrorResponse('Token de verificación inválido o expirado', 400);

        await prisma.user.update({
            where: { id: user.id },
            data: { isVerified: true, verificationToken: null, verificationTokenExp: null }
        });

        return { ...user, _id: user.id };
    }

    async resendVerification(email) {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) throw new ErrorResponse('No se encontró una cuenta con ese email', 404);
        if (user.isVerified) throw new ErrorResponse('Esta cuenta ya está verificada', 400);

        const verificationToken = crypto.randomBytes(20).toString('hex');
        await prisma.user.update({
            where: { id: user.id },
            data: {
                verificationToken,
                verificationTokenExp: new Date(Date.now() + 24 * 60 * 60 * 1000)
            }
        });

        const result = await emailService.sendWelcomeEmail({ name: user.name, email, verificationToken });
        if (!result.success) throw new ErrorResponse('No se pudo enviar el email de verificación. Intentá más tarde.', 503);
        return { message: 'Email de verificación reenviado exitosamente' };
    }

    async login(email, password) {
        if (!email || !password) throw new ErrorResponse('Por favor ingrese email y contraseña', 400);

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) throw new ErrorResponse('Credenciales inválidas', 401);

        const isMatch = await matchPassword(password, user.password);
        if (!isMatch) throw new ErrorResponse('Credenciales inválidas', 401);

        // Attach helper methods expected by authController
        user._id = user.id;
        user.getSignedJwtToken = () => signToken(user.id);
        return user;
    }

    async forgotPassword(email) {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return { message: 'Si el email está registrado, recibirás un enlace de recuperación.' };

        const rawToken = crypto.randomBytes(20).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetPasswordToken: hashedToken,
                resetPasswordExp: new Date(Date.now() + 60 * 60 * 1000)
            }
        });

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:9002';
        const resetUrl = `${frontendUrl}/recuperar-contrasena?token=${rawToken}`;

        const result = await emailService.sendPasswordResetEmail({ name: user.name, email: user.email, resetUrl });

        if (!result.success) {
            await prisma.user.update({
                where: { id: user.id },
                data: { resetPasswordToken: null, resetPasswordExp: null }
            });
            throw new ErrorResponse('No se pudo enviar el email de recuperación. Intentá más tarde.', 503);
        }

        logger.info('Email de recuperación enviado', { email: user.email });
        return { message: 'Si el email está registrado, recibirás un enlace de recuperación.' };
    }

    async resetPassword(rawToken, newPassword) {
        if (!newPassword || newPassword.length < 6) {
            throw new ErrorResponse('La contraseña debe tener al menos 6 caracteres.', 400);
        }

        const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

        const user = await prisma.user.findFirst({
            where: {
                resetPasswordToken: hashedToken,
                resetPasswordExp: { gt: new Date() }
            }
        });

        if (!user) throw new ErrorResponse('El enlace de recuperación es inválido o ha expirado.', 400);

        const hashedPwd = await hashPassword(newPassword);
        const updated = await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPwd, resetPasswordToken: null, resetPasswordExp: null }
        });

        logger.info('Contraseña restablecida', { email: updated.email });
        updated._id = updated.id;
        updated.getSignedJwtToken = () => signToken(updated.id);
        return updated;
    }
}

module.exports = new AuthService();
