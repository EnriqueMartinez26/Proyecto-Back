// ─────────────────────────────────────────────────────────────────────────────
// test-email.js — Script de prueba para verificar Gmail SMTP con Nodemailer
// Ejecutar con:  node test-email.js tu-email-destino@gmail.com
// ─────────────────────────────────────────────────────────────────────────────
require('dotenv').config();
const nodemailer = require('nodemailer');

const TARGET = process.argv[2];

if (!TARGET) {
    console.error('❌ Uso: node test-email.js <email-destino>');
    console.error('   Ejemplo: node test-email.js kuki.martinez04@hotmail.com');
    process.exit(1);
}

async function testEmail() {
    console.log('─── Diagnóstico de Email (Gmail SMTP) ───\n');

    const email = process.env.SMTP_EMAIL;
    const password = process.env.SMTP_PASSWORD;

    console.log(`📧 SMTP_EMAIL:          ${email ? '✅ ' + email : '❌ FALTA'}`);
    console.log(`🔑 SMTP_PASSWORD:       ${password ? '✅ Configurada (****' + password.slice(-4) + ')' : '❌ FALTA'}`);
    console.log(`📬 CONTACT_ADMIN_EMAIL: ${process.env.CONTACT_ADMIN_EMAIL || '⚠️  No configurado'}`);
    console.log(`🎯 Enviar a:            ${TARGET}\n`);

    if (!email || !password) {
        console.error('💥 Faltan SMTP_EMAIL y/o SMTP_PASSWORD en tu .env');
        process.exit(1);
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: email, pass: password }
    });

    // Verificar conexión
    console.log('🔌 Verificando conexión SMTP...');
    try {
        await transporter.verify();
        console.log('✅ Conexión SMTP exitosa!\n');
    } catch (err) {
        console.error('❌ Falló la conexión SMTP:', err.message);
        console.log('\n🔍 Posibles causas:');
        console.log('   • Contraseña de aplicación incorrecta');
        console.log('   • Verificación en 2 pasos no activada en Google');
        console.log('   • Firewall bloqueando conexión a smtp.gmail.com:465');
        process.exit(1);
    }

    // Enviar email de prueba
    console.log('📤 Enviando email de prueba...\n');
    try {
        const info = await transporter.sendMail({
            from: `4Fun Store <${email}>`,
            to: TARGET,
            subject: '🧪 Test de Email — 4Fun Store',
            html: `
        <div style="font-family:sans-serif;padding:30px;background:#0f0f23;color:#fff;border-radius:12px;">
          <h1 style="color:#667eea;">¡Funciona! 🎉</h1>
          <p>El servicio de email de <strong>4Fun Store</strong> está configurado correctamente con Gmail SMTP.</p>
          <p style="color:#888;font-size:13px;">Enviado el: ${new Date().toLocaleString('es-AR')}</p>
        </div>
      `
        });

        console.log('✅ ¡Email enviado exitosamente!');
        console.log(`   Message ID: ${info.messageId}`);
        console.log(`   Revisá la bandeja de entrada (y spam) de: ${TARGET}`);
    } catch (err) {
        console.error('❌ Error al enviar:', err.message);
    }
}

testEmail();
