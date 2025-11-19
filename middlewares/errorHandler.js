const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ 
      success: false, 
      message: 'Error de validación', 
      errors 
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({ 
      success: false, 
      message: `El ${field} ya está registrado` 
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ 
      success: false, 
      message: 'ID inválido' 
    });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Error del servidor'
  });
};

module.exports = errorHandler;
