const EmailService = require('../services/emailService');
const logger = require('../utils/logger');

// @desc    Enviar mensaje de contacto al administrador
// @route   POST /api/contact
// @access  Public
exports.sendMessage = async (req, res, next) => {
  try {
    const { firstName, lastName, email, message } = req.body;

    // Validación de campos requeridos
    if (!firstName || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Los campos nombre, email y mensaje son requeridos.'
      });
    }

    const fullName = [firstName, lastName].filter(Boolean).join(' ');

    if (!EmailService.isAvailable()) {
      logger.warn('contactController: Servicio de email no disponible al intentar enviar contacto', { email });
      return res.status(503).json({
        success: false,
        message: 'El servicio de contacto no está disponible en este momento. Por favor intente más tarde.'
      });
    }

    const result = await EmailService.sendContactNotification({ fullName, email, message });

    if (!result.success) {
      logger.error('contactController: Error al enviar email de contacto', {
        from: email,
        error: result.message
      });
      return res.status(500).json({
        success: false,
        message: 'No se pudo enviar el mensaje. Por favor intente nuevamente.'
      });
    }

    logger.info(`contactController: Mensaje de contacto enviado desde ${email}`);

    return res.status(200).json({
      success: true,
      message: '¡Mensaje enviado correctamente! Nos pondremos en contacto a la brevedad.'
    });

  } catch (error) {
    next(error);
  }
};
