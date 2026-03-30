const express = require('express');
const router = express.Router();
const { sendMessage } = require('../controllers/contactController');
const rateLimit = require('express-rate-limit');

// Rate limiting específico para contacto (evitar spam)
const contactLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 5, // Limita a 5 mensajes por IP por hora
    message: { success: false, message: "Has enviado demasiados mensajes. Por favor intenta más tarde." }
});

router.post('/', contactLimiter, sendMessage);

module.exports = router;
