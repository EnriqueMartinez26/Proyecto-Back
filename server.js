const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/database');
const errorHandler = require('./middlewares/errorHandler');
const validateEnv = require('./middlewares/validateEnv');
const logger = require('./utils/logger'); // Importar Winston

dotenv.config();
validateEnv();
connectDB();

const app = express();

// Seguridad de Headers
app.use(helmet());

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { success: false, message: "Demasiadas peticiones, intenta más tarde." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// --- MIDDLEWARE DE LOGGING (NUEVO) ---
// Registra cada petición HTTP que llega al servidor
app.use((req, res, next) => {
  logger.info(`HTTP Request: ${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Configuración CORS con Logging
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:9002',
      process.env.FRONTEND_URL
    ];
    if (allowedOrigins.indexOf(origin) !== -1 || origin.startsWith('http://192.168.') || origin.includes('ngrok')) {
      callback(null, true);
    } else {
      logger.warn(`Bloqueo CORS para origen desconocido: ${origin}`);
      callback(new Error('Bloqueado por CORS'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '10kb' }));
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
app.use('/api/platforms', require('./routes/platformRoutes'));
app.use('/api/genres', require('./routes/genreRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/contact', require('./routes/contactRoutes'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Manejo de 404
app.use((req, res, next) => {
  logger.warn(`Ruta no encontrada (404): ${req.method} ${req.originalUrl}`);
  const error = new Error(`Ruta no encontrada - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`���️  Seguridad Activada (Helmet + RateLimit)`);
  logger.info(`✅ Servidor corriendo en puerto ${PORT}`);
  logger.info(`��� Modo: ${process.env.NODE_ENV}`);
});
