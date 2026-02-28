const logger = require('../utils/logger');

const validateEnv = () => {
  // Variables críticas — sin estas la app no puede arrancar
  const criticalVars = ['MONGODB_URI', 'JWT_SECRET', 'FRONTEND_URL'];

  const missingCritical = criticalVars.filter((v) => !process.env[v]);
  if (missingCritical.length > 0) {
    logger.error(`❌ FATAL ERROR: Faltan variables de entorno críticas: ${missingCritical.join(', ')}`);
    process.exit(1);
  }

  if (process.env.JWT_SECRET.length < 32) {
    logger.warn('⚠️  JWT_SECRET es muy corta. Debería tener al menos 32 caracteres.');
  }

  // Validar JWT_EXPIRE
  if (!process.env.JWT_EXPIRE) {
    logger.warn('⚠️  JWT_EXPIRE no definido. Usando valor por defecto: 7d');
  }

  // Variables opcionales — la app arranca pero algunas funciones no estarán disponibles
  const optionalVars = ['BACKEND_URL', 'SMTP_EMAIL', 'SMTP_PASSWORD'];
  const missingOptional = optionalVars.filter((v) => !process.env[v]);
  if (missingOptional.length > 0) {
    logger.warn(`⚠️  Variables opcionales no configuradas: ${missingOptional.join(', ')} — algunas funciones (pagos, email) pueden no funcionar.`);
  }

  // Validar config de Email SMTP
  if (process.env.SMTP_EMAIL && !process.env.SMTP_PASSWORD) {
    logger.warn('⚠️  SMTP_EMAIL está definido pero SMTP_PASSWORD no. Los emails no se enviarán.');
  }
  if (process.env.SMTP_PASSWORD && process.env.SMTP_PASSWORD.length < 10) {
    logger.warn('⚠️  SMTP_PASSWORD parece demasiado corta. Las App Passwords de Gmail tienen 16 caracteres.');
  }

  // Validar config de MercadoPago según entorno
  const mpEnv = process.env.MERCADOPAGO_ENV || 'sandbox';
  if (mpEnv === 'production' && !process.env.MERCADOPAGO_ACCESS_TOKEN) {
    logger.warn('⚠️  MERCADOPAGO_ACCESS_TOKEN no configurado en modo production. Los pagos no funcionarán.');
  }
  if (mpEnv === 'sandbox' && !process.env.MERCADOPAGO_SANDBOX_TOKEN) {
    logger.warn('⚠️  MERCADOPAGO_SANDBOX_TOKEN no configurado. MercadoPago sandbox no funcionará.');
  }

  logger.info(`✅ Variables de entorno validadas. (MP: ${mpEnv})`);
};

module.exports = validateEnv;
