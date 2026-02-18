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

// Confiar en el proxy (necesario para cookies seguras en Render/Vercel)
app.set('trust proxy', 1);

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

// --- RUTA DE DIAGNÓSTICO DE EMAIL (TEMPORAL) ---
// Solo invocable con clave secreta: /api/test-email-diag?key=KUKI_DEBUG_2024
app.get('/api/test-email-diag', async (req, res) => {
  if (req.query.key !== 'KUKI_DEBUG_2024') {
    return res.status(403).json({ error: 'Acceso Denegado' });
  }

  const emailService = require('./services/emailService');
  const logger = require('./utils/logger');

  try {
    // 1. Verificar variables de entorno
    const envCheck = {
      SMTP_HOST: process.env.SMTP_HOST || 'MISSING',
      SMTP_PORT: process.env.SMTP_PORT || 'MISSING',
      SMTP_USER: process.env.SMTP_USER || 'MISSING',
      SMTP_PASS_LEN: process.env.SMTP_PASS ? process.env.SMTP_PASS.length : 0,
      NODE_ENV: process.env.NODE_ENV
    };

    // 2. Intentar enviar email con logging explícito
    logger.info('Iniciando Test de Email Manual...', envCheck);

    const result = await emailService.sendEmail({
      to: process.env.SMTP_USER, // Se auto-envía
      subject: '🔍 Diagnóstico de Email Render',
      html: `<h1>Test Exitoso</h1><pre>${JSON.stringify(envCheck, null, 2)}</pre>`
    });

    if (result.success) {
      return res.json({
        success: true,
        message: 'Email enviado correctamente',
        messageId: result.messageId,
        env: envCheck
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.message,
        env: envCheck,
        details: 'El servicio devolvió error interno.'
      });
    }

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      envCheck: 'Error al chequear variables'
    });
  }
});


// Configuración CORS con Logging
app.use(cors({
  origin: function (origin, callback) {
    // Permitir peticiones sin origen (como apps móviles o curl)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:9002',
      'http://localhost:9005',
      'https://unsubducted-subuncinate-brittni.ngrok-free.dev',
      process.env.FRONTEND_URL
    ];

    // Lógica flexible para Vercel y desarrollo
    const isAllowedVercel = origin.includes('vercel.app') && origin.includes('4funstore');
    const isAllowedLocal = origin.startsWith('http://192.168.') || origin.startsWith('http://localhost');
    const isAllowedNgrok = origin.includes('ngrok');

    if (allowedOrigins.indexOf(origin) !== -1 || isAllowedVercel || isAllowedLocal || isAllowedNgrok) {
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

app.use('/api/platforms', require('./routes/platformRoutes'));
app.use('/api/genres', require('./routes/genreRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes')); // Nuevo Dashboard

app.use('/api/keys', require('./routes/keyRoutes')); // Rutas de Keys
app.use('/api/coupons', require('./routes/couponRoutes')); // Rutas de Cupones
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
