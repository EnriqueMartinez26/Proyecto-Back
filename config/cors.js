const cors = require('cors');
const logger = require('../utils/logger');

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);

        const allowedOrigins = [
            'http://localhost:3000',
            'https://4funstore-vercel.vercel.app',
            process.env.FRONTEND_URL
        ];

        // Permitir cualquier subdominio de vercel que contenga tu proyecto
        const isAllowedVercel = origin.includes('vercel.app') && origin.includes('4funstore');

        if (allowedOrigins.indexOf(origin) !== -1 || isAllowedVercel) {
            callback(null, true);
        } else {
            // IMPORTANTE: No lances Error, mejor loguea y rechaza silenciosamente para evitar crasheos
            logger.warn(`CORS rejected for origin: ${origin}`);
            callback(null, false);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning']
};

module.exports = cors(corsOptions);
