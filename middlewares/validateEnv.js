const logger = require('../utils/logger');

const validateEnv = () => {
  const requiredEnvVars = [
    'MONGODB_URI',
    'JWT_SECRET',
    'FRONTEND_URL',
    'BACKEND_URL',
    'RESEND_API_KEY',
    'RESEND_FROM_EMAIL',
  ];

  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName]
  );

  if (missingVars.length > 0) {
    logger.error(`❌ FATAL ERROR: Faltan variables de entorno requeridas: ${missingVars.join(', ')}`);
    process.exit(1);
  }

  if (process.env.JWT_SECRET.length < 32) {
    logger.warn('⚠️  ADVERTENCIA: JWT_SECRET es muy corta. Debería tener al menos 32 caracteres para ser segura.');
  }

  // Validar config de MercadoPago según entorno
  const mpEnv = process.env.MERCADOPAGO_ENV || 'sandbox';
  if (mpEnv === 'production' && !process.env.MERCADOPAGO_ACCESS_TOKEN) {
    logger.error('❌ FATAL ERROR: MERCADOPAGO_ACCESS_TOKEN es requerido en modo production.');
    process.exit(1);
  }
  if (mpEnv === 'sandbox' && !process.env.MERCADOPAGO_SANDBOX_TOKEN) {
    logger.warn('⚠️  ADVERTENCIA: MERCADOPAGO_SANDBOX_TOKEN no configurado. MercadoPago no funcionará en sandbox.');
  }

  logger.info(`✅ Variables de entorno validadas correctamente. (MP: ${mpEnv})`);
};

module.exports = validateEnv;
