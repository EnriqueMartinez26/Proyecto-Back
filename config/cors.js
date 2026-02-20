const cors = require('cors');
const logger = require('../utils/logger');

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);

        const allowedOrigins = [
            'http://localhost:3000',
            'https://4funstore-vercel.vercel.app',
            process.env.FRONTEND_URL
        ].filter(Boolean);

        // Permitir previews dinámicos de Vercel
        const isAllowedVercel = origin.includes('vercel.app') && origin.includes('4funstore');

        if (allowedOrigins.includes(origin) || isAllowedVercel) {
            callback(null, true);
        } else {
            // Nota: Se rechaza silenciosamente registrando el log en lugar de lanzar una excepción para evitar caídas de la aplicación por bots.
            logger.warn(`CORS rejected for origin: ${origin}`);
            callback(null, false);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning']
};

module.exports = cors(corsOptions);
