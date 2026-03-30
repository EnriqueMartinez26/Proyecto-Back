const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const options = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    const conn = await mongoose.connect(process.env.MONGODB_URI, options);

    logger.info('✅ MongoDB conectado exitosamente');
    logger.info(`📊 Base de datos: ${conn.connection.name}`);
    logger.info(`🌐 Host: ${conn.connection.host}`);

  } catch (error) {
    logger.error(`❌ Error conectando a MongoDB: ${error.message}`);

    // Mensajes de error más específicos
    if (error.name === 'MongoNetworkError') {
      logger.error('💡 Verifica tu conexión a internet y las credenciales de MongoDB Atlas');
    }
    if (error.name === 'MongooseServerSelectionError') {
      logger.error('💡 Verifica que tu IP esté en la lista blanca de MongoDB Atlas');
    }

    // En Vercel matar el proceso (process.exit) genera FUNCTION_INVOCATION_FAILED y oculta el log completo
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    } else {
      throw error;
    }
  }
};

// Eventos de conexión
mongoose.connection.on('connected', () => {
  logger.info('🔗 Mongoose conectado a MongoDB');
});

mongoose.connection.on('error', (err) => {
  logger.error('❌ Error de conexión de Mongoose:', err);
});

mongoose.connection.on('disconnected', () => {
  logger.info('🔌 Mongoose desconectado');
});

// Manejo de cierre graceful
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  logger.info('🛑 Mongoose desconectado por terminación de la aplicación');
  process.exit(0);
});

module.exports = connectDB;
