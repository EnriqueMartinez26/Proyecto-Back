const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const connectDB = require('./config/database');
const errorHandler = require('./middlewares/errorHandler');
const validateEnv = require('./middlewares/validateEnv');

dotenv.config();
validateEnv();
connectDB();

const app = express();

// --- CONFIGURACIÓN CORS ROBUSTA ---
// Permitimos localhost y cualquier IP de red local (192.168.x.x)
app.use(cors({
  origin: function (origin, callback) {
    // Permitir peticiones sin origen (como Postman o Server-to-Server)
    if (!origin) return callback(null, true);
    
    // Lista blanca explícita
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:9002',
      process.env.FRONTEND_URL
    ];

    // Lógica: Permitir si está en la lista blanca O si es una IP local (para pruebas en móvil/red)
    if (allowedOrigins.indexOf(origin) !== -1 || origin.startsWith('http://192.168.')) {
      callback(null, true);
    } else {
      console.error('Bloqueado por CORS:', origin);
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true, // Importante para las cookies de sesión
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
// ----------------------------------

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(mongoSanitize());

// Rutas
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/cart', require('./routes/cartRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/wishlist', require('./routes/wishlistRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((req, res, next) => {
    const error = new Error(`Ruta no encontrada - ${req.originalUrl}`);
    error.statusCode = 404;
    next(error);
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en puerto ${PORT}`);
    console.log(`��� Modo: ${process.env.NODE_ENV}`);
});
