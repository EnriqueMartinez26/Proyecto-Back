const EmailService = require('../services/emailService');
const logger = require('../utils/logger');

// @desc    Enviar mensaje de contacto
// @route   POST /api/contact
// @access  Public
exports.sendMessage = async (req, res, next) => {
    try {
        const { firstName, lastName, email, message } = req.body;

        // Validación simple
        if (!firstName || !email || !message) {
            return res.status(400).json({
                success: false,
                message: 'Por favor complete todos los campos requeridos (Nombre, Email, Mensaje)'
            });
        }

        const fullName = `${firstName} ${lastName || ''}`.trim();

        const htmlContent = `
            <h3>Nuevo Mensaje de Contacto</h3>
            <p><strong>De:</strong> ${fullName} (${email})</p>
            <p><strong>Mensaje:</strong></p>
            <p style="background-color: #f4f4f4; padding: 15px; border-radius: 5px;">${message}</p>
        `;

        // Enviar email al administrador (usando EMAIL_FROM o EMAIL_USER como destinatario por defecto para notificaciones internas)
        const adminEmail = process.env.EMAIL_USER || process.env.EMAIL_FROM;

        if (!adminEmail) {
            logger.warn('No se puede enviar correo de contacto: Email de administrador no configurado.');
            return res.status(500).json({ success: false, message: 'Servicio de contacto no disponible momentáneamente.' });
        }

        const result = await EmailService.sendEmail({
            to: adminEmail,
            subject: `📢 Contacto Web: Mensaje de ${fullName}`,
            html: htmlContent
        });

        if (!result.success) {
            return res.status(500).json({ success: false, message: 'Error al enviar el mensaje. Intente más tarde.' });
        }

        res.status(200).json({
            success: true,
            message: '¡Mensaje enviado con éxito! Nos pondremos en contacto pronto.'
        });

    } catch (error) {
        next(error);
    }
};
