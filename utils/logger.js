const winston = require('winston');
const path = require('path');

// Definimos el formato de los logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }), // Captura el stack trace de errores
  winston.format.splat(),
  winston.format.json()
);

const logger = winston.createLogger({
  level: 'info',
  format: logFormat,
  defaultMeta: { service: '4fun-backend' },
  transports: [
    // 1. Archivo para errores críticos (Nivel error o menor)
    new winston.transports.File({ 
      filename: path.join(__dirname, '../logs/error.log'), 
      level: 'error' 
    }),
    // 2. Archivo para todos los logs (Información general)
    new winston.transports.File({ 
      filename: path.join(__dirname, '../logs/combined.log') 
    })
  ]
});

// Si no estamos en producción, también mostramos logs en la consola con colores
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

module.exports = logger;
