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

// --- CORRECCIÓN: Cargar índice completo ---
const routes = require('./routes/index');
app.use('/api', routes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));
// ... resto de manejo de errores ...

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));