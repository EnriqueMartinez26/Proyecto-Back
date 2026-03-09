const winston = require('winston');
const path = require('path');

// Definimos el formato de los logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Opciones comunes para rotación de archivos
const fileOptions = {
  maxsize: 5 * 1024 * 1024, // 5MB por archivo
  maxFiles: 5,               // Mantener 5 archivos rotados
  tailable: true,
};

// Configuramos los transports condicionalmente
const transports = [];

// En la nube (Vercel, Render, etc.) casi siempre dependemos del Console 
// porque los logs del filesystem no persisten o están bloqueados.
transports.push(new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple()
  )
}));

// Si NO estamos en producción, habilitamos la escritura en disco (desarrollo local).
// En producción (Vercel, Render, etc.) el filesystem es read-only o efímero.
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/error.log'),
      level: 'error',
      ...fileOptions
    })
  );
  transports.push(
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/combined.log'),
      ...fileOptions
    })
  );
}

const logger = winston.createLogger({
  level: 'info',
  format: logFormat,
  defaultMeta: { service: '4fun-backend' },
  transports: transports
});

module.exports = logger;
