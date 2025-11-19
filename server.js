const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/database');

// Cargar variables de entorno
dotenv.config();

// Conectar a la base de datos
connectDB();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- CORRECCIÓN: Usar el índice de rutas ---
// Esto carga automáticamente auth, products, cart, wishlist, etc.
const routes = require('./routes/index');
app.use('/api', routes);
// ------------------------------------------

// Ruta de health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Manejo de rutas no encontradas
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Ruta no encontrada' });
});

// Manejo de errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Error en el servidor',
        error: err.message
    });
});

const PORT = process.env.PORT || 9003; // Ajustado a tu puerto

app.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en puerto ${PORT}`);
});