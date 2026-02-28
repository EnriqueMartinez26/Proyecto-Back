const logger = require('../utils/logger');

/**
 * Middleware Global de Errores con Winston Logging
 */
const errorHandler = (err, req, res, next) => {
  // Sanitize body before logging — remove sensitive fields
  const safeBody = { ...req.body };
  delete safeBody.password;
  delete safeBody.confirmPassword;
  delete safeBody.token;

  logger.error(`Error del Servidor: ${err.message}`, {
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    body: safeBody
  });

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Error interno del servidor';
  let errors = undefined;

  if (err.name === 'ValidationError') {
    statusCode = 400;
    errors = Object.values(err.errors).map(e => e.message);
    message = errors.length > 0 ? errors.join('. ') : 'Error de validación de datos';
  } else if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyPattern)[0];
    message = `El valor del campo '${field}' ya existe`;
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = `Formato inválido para el campo: ${err.path}`;
  }

  res.status(statusCode).json({
    success: false,
    error: {
      type: err.name,
      message: message,
      details: errors,
      // Solo mostramos stack trace en desarrollo
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    },
    timestamp: new Date().toISOString()
  });
};

module.exports = errorHandler;
