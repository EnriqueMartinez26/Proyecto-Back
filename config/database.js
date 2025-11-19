const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    const conn = await mongoose.connect(process.env.MONGODB_URI, options);

    console.log('✅ MongoDB conectado exitosamente');
    console.log(`📊 Base de datos: ${conn.connection.name}`);
    console.log(`🌐 Host: ${conn.connection.host}`);
    
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error.message);
    
    // Mensajes de error más específicos
    if (error.name === 'MongoNetworkError') {
      console.error('💡 Verifica tu conexión a internet y las credenciales de MongoDB Atlas');
    }
    if (error.name === 'MongooseServerSelectionError') {
      console.error('💡 Verifica que tu IP esté en la lista blanca de MongoDB Atlas');
    }
    
    process.exit(1);
  }
};

// Eventos de conexión
mongoose.connection.on('connected', () => {
  console.log('🔗 Mongoose conectado a MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Error de conexión de Mongoose:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('🔌 Mongoose desconectado');
});

// Manejo de cierre graceful
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('🛑 Mongoose desconectado por terminación de la aplicación');
  process.exit(0);
});

module.exports = connectDB;
