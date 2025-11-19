const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/database');
const routes = require('./routes/index'); // Cargar índice

dotenv.config();
connectDB();
const app = express();
app.use(cors());
app.use(express.json());

app.use('/api', routes); 

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Servidor en puerto ${PORT}`));