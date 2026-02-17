require('dotenv').config();
const nodemailer = require('nodemailer');

const testEmail = async () => {
    console.log('📧 Probando configuración SMTP...');

    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM_EMAIL, SMTP_FROM_NAME } = process.env;

    if (!SMTP_USER || !SMTP_PASS) {
        console.error('❌ Faltan credenciales en .env');
        return;
    }

    const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT) || 587,
        secure: false, // true solo para 465
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    try {
        console.log(`🔌 Conectando a ${SMTP_HOST}:${SMTP_PORT} como ${SMTP_USER}...`);
        await transporter.verify();
        console.log('✅ Conexión SMTP exitosa.');

        const mailOptions = {
            from: `"${SMTP_FROM_NAME}" <${SMTP_FROM_EMAIL}>`,
            to: SMTP_USER, // Nos auto-enviamos el mail
            subject: '✅ Prueba de Configuración 4Fun Store',
            text: 'Si lees esto, el sistema de correos funciona perfectamente.',
            html: '<h1 style="color: #667eea;">¡Funciona! 🚀</h1><p>El sistema de correos de 4Fun Store está operativo.</p>'
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('📨 Email enviado:', info.messageId);
        console.log('👉 Revisa tu bandeja de entrada (o spam) en', SMTP_USER);

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) console.error('Detalle:', error.response);
    }
};

testEmail();
