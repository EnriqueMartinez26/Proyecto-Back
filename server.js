const express = require('express');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const hpp = require('hpp');
const connectDB = require('./config/database');
const errorHandler = require('./middlewares/errorHandler');
const validateEnv = require('./middlewares/validateEnv');
const logger = require('./utils/logger'); // Importar Winston

dotenv.config();
validateEnv();
connectDB();

const app = express();

// Verificar proxy para funcionamiento de cookies seguras en balanceadores de carga (Render/Vercel).
app.set('trust proxy', 1);

app.use(helmet());
app.use(require('./config/cors')); // CORS primero: descarta peticiones no autorizadas sin gastar CPU en ratelimit/logs

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { success: false, message: "Demasiadas peticiones, intenta más tarde." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

app.use((req, res, next) => {
  // Skip logging health checks and static assets to reduce log noise
  if (req.url !== '/health') {
    logger.info(`${req.method} ${req.url}`, { ip: req.ip });
  }
  next();
});

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(compression());
app.use(hpp());

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/cart', require('./routes/cartRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/wishlist', require('./routes/wishlistRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/users', require('./routes/userRoutes'));

app.use('/api/platforms', require('./routes/platformRoutes'));
app.use('/api/genres', require('./routes/genreRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));

app.use('/api/keys', require('./routes/keyRoutes'));
app.use('/api/coupons', require('./routes/couponRoutes'));
app.use('/api/contact', require('./routes/contactRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((req, res, next) => {
  logger.warn(`Ruta no encontrada (404): ${req.method} ${req.originalUrl}`);
  const error = new Error(`Ruta no encontrada - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  logger.info(`🛡️  Seguridad Activada (Helmet + RateLimit)`);
  logger.info(`✅ Servidor corriendo en puerto ${PORT}`);
  logger.info(`🌍 Modo: ${process.env.NODE_ENV}`);
});

// Graceful shutdown (Render envía SIGTERM al redeploy)
process.on('SIGTERM', () => {
  logger.info('🛑 SIGTERM recibido. Cerrando servidor...');
  server.close(() => {
    logger.info('✅ Servidor cerrado limpiamente.');
    process.exit(0);
  });
});
