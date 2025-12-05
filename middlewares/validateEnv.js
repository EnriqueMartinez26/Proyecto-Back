const validateEnv = () => {
  const requiredEnvVars = [
    'MONGODB_URI',  
    'JWT_SECRET',
    'FRONTEND_URL'
  ];

  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName]
  );

  if (missingVars.length > 0) {
    console.error(`❌ FATAL ERROR: Faltan variables de entorno requeridas: ${missingVars.join(', ')}`);
    process.exit(1); // Detener la aplicación inmediatamente
  }

  if (process.env.JWT_SECRET.length < 32) {
    console.warn('⚠️  ADVERTENCIA: JWT_SECRET es muy corta. Debería tener al menos 32 caracteres para ser segura.');
  }

  console.log('✅ Variables de entorno validadas correctamente.');
};

module.exports = validateEnv;
