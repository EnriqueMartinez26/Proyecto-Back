const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/database');

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- CORRECCIÓN: Usar el índice central ---
const routes = require('./routes/index');
app.use('/api', routes); // Esto habilita auth, cart, products, wishlist, etc.
// -----------------------------------------

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Manejo de errores básico
app.use((req, res) => res.status(404).json({ success: false, message: 'Ruta no encontrada' }));
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
});

const PORT = process.env.PORT || 9003;
app.listen(PORT, () => console.log(`✅ Servidor corriendo en puerto ${PORT}`));