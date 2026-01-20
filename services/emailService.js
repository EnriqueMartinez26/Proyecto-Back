const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

/**
 * Servicio de Email para la aplicación 4Fun
 * Soporta Gmail, Hotmail y Outlook
 */
class EmailService {
    constructor() {
        this.transporter = null;
        this.initialized = false;
    }

    /**
     * Inicializa el transportador de correo
     * Compatible con Gmail, Hotmail, Outlook y otros proveedores SMTP
     */
    initialize() {
        if (this.initialized) return;

        const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD, EMAIL_FROM } = process.env;

        // Verificar que las variables de entorno están configuradas
        if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASSWORD) {
            logger.warn('Configuración de email incompleta. El servicio de correo está deshabilitado.', {
                hasHost: !!EMAIL_HOST,
                hasUser: !!EMAIL_USER,
                hasPassword: !!EMAIL_PASSWORD
            });
            return;
        }

        // Configuración del transportador
        this.transporter = nodemailer.createTransport({
            host: EMAIL_HOST,
            port: parseInt(EMAIL_PORT) || 587,
            secure: parseInt(EMAIL_PORT) === 465, // true para 465, false para otros puertos
            auth: {
                user: EMAIL_USER,
                pass: EMAIL_PASSWORD
            },
            // Configuración adicional para evitar problemas con certificados en desarrollo
            tls: {
                rejectUnauthorized: process.env.NODE_ENV === 'production'
            }
        });

        this.fromAddress = EMAIL_FROM || EMAIL_USER;
        this.initialized = true;

        logger.info('Servicio de email inicializado correctamente', {
            host: EMAIL_HOST,
            port: EMAIL_PORT,
            user: EMAIL_USER.substring(0, 3) + '***' // Log parcial por seguridad
        });
    }

    /**
     * Verifica si el servicio de email está disponible
     */
    isAvailable() {
        return this.initialized && this.transporter !== null;
    }

    /**
     * Envía un correo electrónico
     * @param {Object} options - Opciones del correo
     * @param {string} options.to - Destinatario
     * @param {string} options.subject - Asunto
     * @param {string} options.html - Contenido HTML
     * @param {string} options.text - Contenido texto plano (opcional)
     */
    async sendEmail({ to, subject, html, text }) {
        // Inicializar si no está inicializado
        if (!this.initialized) {
            this.initialize();
        }

        if (!this.isAvailable()) {
            logger.warn('Intento de envío de email pero el servicio no está disponible', { to, subject });
            return { success: false, message: 'Servicio de email no configurado' };
        }

        try {
            const mailOptions = {
                from: `"4Fun Store" <${this.fromAddress}>`,
                to,
                subject,
                html,
                text: text || this.htmlToText(html)
            };

            const info = await this.transporter.sendMail(mailOptions);

            logger.info('Email enviado exitosamente', {
                to,
                subject,
                messageId: info.messageId
            });

            return { success: true, messageId: info.messageId };
        } catch (error) {
            logger.error('Error al enviar email', {
                to,
                subject,
                error: error.message,
                stack: error.stack
            });
            return { success: false, message: error.message };
        }
    }

    /**
     * Convierte HTML básico a texto plano
     */
    htmlToText(html) {
        return html
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Envía correo de bienvenida tras registro exitoso
     * @param {Object} user - Datos del usuario
     * @param {string} user.name - Nombre del usuario
     * @param {string} user.email - Email del usuario
     */
    async sendWelcomeEmail(user) {
        const { name, email } = user;
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        const html = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f0f23;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f0f23; padding: 40px 20px;">
                <tr>
                    <td align="center">
                        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.4);">
                            
                            <!-- Header -->
                            <tr>
                                <td style="background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); padding: 40px 40px 30px; text-align: center;">
                                    <h1 style="margin: 0; font-size: 36px; font-weight: 700; color: #ffffff; letter-spacing: 2px;">
                                        🎮 4FUN
                                    </h1>
                                    <p style="margin: 10px 0 0; font-size: 14px; color: rgba(255,255,255,0.85); text-transform: uppercase; letter-spacing: 3px;">
                                        Tu tienda de videojuegos
                                    </p>
                                </td>
                            </tr>
                            
                            <!-- Content -->
                            <tr>
                                <td style="padding: 50px 40px;">
                                    <h2 style="margin: 0 0 20px; font-size: 28px; font-weight: 600; color: #ffffff;">
                                        ¡Bienvenido/a, ${name}! 🎉
                                    </h2>
                                    
                                    <p style="margin: 0 0 25px; font-size: 16px; line-height: 1.7; color: #a0a0b9;">
                                        Tu cuenta ha sido creada exitosamente. Ahora sos parte de la comunidad <strong style="color: #667eea;">4Fun</strong>, donde encontrarás los mejores videojuegos y ofertas exclusivas.
                                    </p>
                                    
                                    <div style="background: rgba(102, 126, 234, 0.1); border-left: 4px solid #667eea; padding: 20px; border-radius: 0 8px 8px 0; margin: 30px 0;">
                                        <p style="margin: 0; font-size: 15px; color: #c0c0d9;">
                                            <strong style="color: #667eea;">📧 Tu email registrado:</strong><br>
                                            <span style="color: #ffffff;">${email}</span>
                                        </p>
                                    </div>
                                    
                                    <p style="margin: 25px 0 30px; font-size: 16px; line-height: 1.7; color: #a0a0b9;">
                                        Ya podés explorar nuestro catálogo, agregar juegos a tu wishlist y realizar compras de manera segura.
                                    </p>
                                    
                                    <!-- CTA Button -->
                                    <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                                        <tr>
                                            <td style="border-radius: 8px; background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);">
                                                <a href="${frontendUrl}" target="_blank" style="display: inline-block; padding: 16px 40px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; letter-spacing: 0.5px;">
                                                    🛒 Explorar Tienda
                                                </a>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            
                            <!-- Features -->
                            <tr>
                                <td style="padding: 0 40px 40px;">
                                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                        <tr>
                                            <td width="33%" style="padding: 15px; text-align: center; background: rgba(255,255,255,0.03); border-radius: 12px;">
                                                <div style="font-size: 28px; margin-bottom: 10px;">🎮</div>
                                                <div style="font-size: 13px; color: #a0a0b9;">Catálogo<br>Extenso</div>
                                            </td>
                                            <td width="10"></td>
                                            <td width="33%" style="padding: 15px; text-align: center; background: rgba(255,255,255,0.03); border-radius: 12px;">
                                                <div style="font-size: 28px; margin-bottom: 10px;">🔒</div>
                                                <div style="font-size: 13px; color: #a0a0b9;">Compras<br>Seguras</div>
                                            </td>
                                            <td width="10"></td>
                                            <td width="33%" style="padding: 15px; text-align: center; background: rgba(255,255,255,0.03); border-radius: 12px;">
                                                <div style="font-size: 28px; margin-bottom: 10px;">⚡</div>
                                                <div style="font-size: 13px; color: #a0a0b9;">Entrega<br>Inmediata</div>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            
                            <!-- Footer -->
                            <tr>
                                <td style="background: rgba(0,0,0,0.2); padding: 30px 40px; text-align: center; border-top: 1px solid rgba(255,255,255,0.05);">
                                    <p style="margin: 0 0 15px; font-size: 13px; color: #6b6b80;">
                                        © ${new Date().getFullYear()} 4Fun Store. Todos los derechos reservados.
                                    </p>
                                    <p style="margin: 0; font-size: 12px; color: #4a4a5c;">
                                        Si no creaste esta cuenta, puedes ignorar este correo.
                                    </p>
                                </td>
                            </tr>
                            
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        `;

        return this.sendEmail({
            to: email,
            subject: '🎮 ¡Bienvenido/a a 4Fun! Tu cuenta ha sido creada',
            html
        });
    }
}

module.exports = new EmailService();
