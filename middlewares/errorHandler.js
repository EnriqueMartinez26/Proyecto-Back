/**
 * Middleware Global de Errores
 * Sigue el estándar RFC 7807 (Problem Details for HTTP APIs) de forma simplificada.
 */
const errorHandler = (err, req, res, next) => {
  // Log del error para observabilidad (siempre logueamos todo en el servidor)
  console.error(`[Error] ${err.message}`, { stack: err.stack });

  // Valores por defecto
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Error interno del servidor';
  let errors = undefined;

  // Manejo específico de errores de Mongoose (Mapeo de Infraestructura a Dominio)
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Error de validación de datos';
    errors = Object.values(err.errors).map(e => e.message);
  } else if (err.code === 11000) {
    statusCode = 409; // Conflict
    const field = Object.keys(err.keyPattern)[0];
    message = `El valor del campo '${field}' ya existe en el sistema`;
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = `Formato inválido para el campo: ${err.path}`;
  }

  // Respuesta Segura al Cliente
  res.status(statusCode).json({
    success: false,
    error: {
      type: err.name,
      message: message,
      details: errors,
      // Solo mostramos stack trace en desarrollo por seguridad (OWASP A05:2021)
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    },
    timestamp: new Date().toISOString()
  });
};

module.exports = errorHandler;