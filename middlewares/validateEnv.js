const validateEnv = () => {
  const requiredEnvVars = [
    'MONGODB_URI',  
    'JWT_SECRET'
  ];

  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName]
  );

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
  }
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.warn('⚠️  JWT_SECRET should be at least 32 characters long');
  }

  console.log('✅ Environment variables validated successfully');
};

module.exports = validateEnv;
