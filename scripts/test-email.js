require('dotenv').config();
const nodemailer = require('nodemailer');

const testEmail = async () => {
    console.log('--- TEST DE CONFIGURACIÓN DE EMAIL ---');
    console.log('Host:', process.env.EMAIL_HOST);
    console.log('Port:', process.env.EMAIL_PORT);
    console.log('User:', process.env.EMAIL_USER);
    console.log('From:', process.env.EMAIL_FROM);
    console.log('--------------------------------------');

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        console.error('❌ Error: EMAIL_USER o EMAIL_PASSWORD no configurados en .env');
        return;
    }

    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: parseInt(process.env.EMAIL_PORT) === 465,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        },
        tls: {
            // Permitir certificados autorefrendados para pruebas
            rejectUnauthorized: false
        }
    });

    try {
        console.log('⏳ Verificando conexión con el servidor SMTP...');
        await transporter.verify();
        console.log('✅ Conexión exitosa con el servidor SMTP.');

        console.log('⏳ Enviando email de prueba...');
        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
            to: process.env.EMAIL_USER, // Se auto-envía el mail
            subject: '🔍 Test de Configuración 4Fun Store',
            text: 'Si recibiste este mail, la configuración de SMTP en tu archivo .env es correcta.',
            html: '<h3>✅ Conexión Exitosa</h3><p>La configuración de SMTP en tu archivo <b>.env</b> es correcta y el servicio de mail está operativo.</p>'
        });

        console.log('✅ Email enviado con éxito!');
        console.log('ID del mensaje:', info.messageId);
    } catch (error) {
        console.error('❌ Error detectado:');
        console.error('Mensaje:', error.message);
        console.error('Código:', error.code || 'N/A');

        if (error.message.includes('Invalid login') || error.message.includes('auth')) {
            console.log('\n💡 Sugerencia técnica:');
            console.log('Parece un problema de credenciales. Si usas Gmail:');
            console.log('1. Asegúrate de tener activada la Verificación en 2 pasos.');
            console.log('2. Usa una "Contraseña de aplicación" (App Password) de 16 caracteres.');
            console.log('3. No uses tu contraseña normal de Gmail.');
        }
    }
};

testEmail();
