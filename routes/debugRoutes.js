const express = require('express');
const router = express.Router();
const emailService = require('../services/emailService');
const logger = require('../utils/logger');

// --- RUTA DE DIAGNÓSTICO DE EMAIL (TEMPORAL) ---
// Solo invocable con clave secreta: /api/test-email-diag?key=KUKI_DEBUG_2024
router.get('/test-email-diag', async (req, res) => {
    if (req.query.key !== 'KUKI_DEBUG_2024') {
        return res.status(403).json({ error: 'Acceso Denegado' });
    }

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

module.exports = router;
