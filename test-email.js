// ─────────────────────────────────────────────────────────────────────────────
// test-email.js — Script de prueba para verificar la configuración de Resend
// Ejecutar con:  node test-email.js tu-email@gmail.com
// ─────────────────────────────────────────────────────────────────────────────
require('dotenv').config();
const { Resend } = require('resend');

const TARGET = process.argv[2];

if (!TARGET) {
    console.error('❌ Uso: node test-email.js <tu-email-destino@gmail.com>');
    process.exit(1);
}

async function testEmail() {
    console.log('─── Diagnóstico de Email ───\n');

    // 1. Verificar variables de entorno
    const apiKey = process.env.RESEND_API_KEY;
    const fromRaw = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    console.log(`🔑 RESEND_API_KEY:      ${apiKey ? '✅ Configurada (' + apiKey.slice(0, 8) + '...)' : '❌ FALTA — setear en .env'}`);
    console.log(`📧 RESEND_FROM_EMAIL:   ${fromRaw}`);
    console.log(`📬 CONTACT_ADMIN_EMAIL: ${process.env.CONTACT_ADMIN_EMAIL || '⚠️  No configurado'}`);
    console.log(`🎯 Enviar a:            ${TARGET}\n`);

    if (!apiKey) {
        console.error('💥 No se puede continuar sin RESEND_API_KEY. Configurala en tu archivo .env');
        process.exit(1);
    }

    // 2. Parsear el from (misma lógica defensiva del emailService)
    const match = fromRaw.match(/<([^>]+)>/);
    const fromEmail = match ? match[1] : fromRaw.trim();
    if (match) {
        console.log(`⚠️  RESEND_FROM_EMAIL contenía display name — se extrajo: ${fromEmail}`);
        console.log(`   Corregí tu .env para usar solo el email.\n`);
    }

    // 3. Intentar enviar
    const resend = new Resend(apiKey);
    console.log('📤 Enviando email de prueba...\n');

    try {
        const { data, error } = await resend.emails.send({
            from: `4Fun Store <${fromEmail}>`,
            to: [TARGET],
            subject: '🧪 Test de Email — 4Fun Store',
            html: `
        <div style="font-family:sans-serif;padding:20px;background:#0f0f23;color:#fff;border-radius:12px;">
          <h1 style="color:#667eea;">¡Funciona! 🎉</h1>
          <p>El servicio de email de <strong>4Fun Store</strong> está configurado correctamente.</p>
          <p style="color:#888;font-size:13px;">Enviado el: ${new Date().toLocaleString('es-AR')}</p>
        </div>
      `
        });

        if (error) {
            console.error('❌ Error de Resend:', JSON.stringify(error, null, 2));
            console.log('\n🔍 Posibles causas:');
            console.log('   • API Key inválida o expirada');
            console.log('   • Email "from" no autorizado (verificar dominio en Resend)');
            console.log('   • Cuenta de Resend suspendida');
        } else {
            console.log(`✅ ¡Email enviado exitosamente!`);
            console.log(`   ID: ${data.id}`);
            console.log(`   Revisá la bandeja de entrada (y spam) de: ${TARGET}`);
        }
    } catch (err) {
        console.error('💥 Excepción:', err.message);
        console.log('\n🔍 Verificá:');
        console.log('   • Conexión a internet');
        console.log('   • Que la API Key sea válida');
        console.log('   • Firewall / proxy bloqueando conexiones salientes');
    }
}

testEmail();
