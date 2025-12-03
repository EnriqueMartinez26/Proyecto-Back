const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/database');
const errorHandler = require('./middlewares/errorHandler');

dotenv.config();
connectDB();

const app = express();

// --- CORRECCIÓN CORS ---
// Definimos una lista blanca de orígenes permitidos
const allowedOrigins = [
  'http://localhost:3000', // Next.js default
  'http://localhost:9002', // Tu puerto actual de Frontend
  process.env.FRONTEND_URL // Variable de entorno opcional
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Permitir peticiones sin origen (como Postman o apps móviles)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('Bloqueado por CORS:', origin); // Log para depuración
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true 
}));
// ----------------------

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

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

// Usamos el puerto definido o 5000 por defecto (parece que estás usando 9003 en tu env)
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en puerto ${PORT}`);
});