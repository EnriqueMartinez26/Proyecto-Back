/**
 * emailService.integration.test.js
 *
 * Prueba de integración real contra Gmail SMTP (port 465/SSL).
 * REQUIERE un archivo .env.test en la raíz del proyecto con:
 *
 *   SMTP_EMAIL=tu-gmail@gmail.com
 *   SMTP_PASSWORD=xxxx xxxx xxxx xxxx   (App Password de 16 chars)
 *   FRONTEND_URL=http://localhost:9002
 *   TEST_RECIPIENT=destinatario@example.com   (dónde quieres recibir el correo de prueba)
 *
 * Ejecutar:
 *   npx jest emailService.integration --testPathPattern=emailService.integration
 *
 * NUNCA committear .env.test — está en .gitignore.
 */

const path = require('path');

// Cargar variables de entorno desde .env.test antes de inicializar el servicio
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.test') });

// Timeout extendido: la conexión SMTP + reintentos puede tardar hasta 15 s
jest.setTimeout(30_000);

describe('EmailService — integración SMTP (Gmail port 465/SSL)', () => {
  let emailService;

  beforeAll(() => {
    // Importar DESPUÉS de setear env vars para que _getTransporter los lea
    emailService = require('../../services/emailService');
  });

  afterAll(async () => {
    // Cerrar el pool de conexiones SMTP para que Jest pueda salir limpiamente
    if (emailService._transporter) {
      emailService._transporter.close();
      emailService._transporter = null;
    }
  });

  // ── 1. Disponibilidad del transporter ──────────────────────────────────────
  test('isAvailable() devuelve true cuando las credenciales están configuradas', async () => {
    const available = await emailService.isAvailable();
    expect(available).toBe(true);
  });

  // ── 2. sendWelcomeEmail ────────────────────────────────────────────────────
  test('sendWelcomeEmail() retorna success:true y un messageId válido', async () => {
    const recipient = process.env.TEST_RECIPIENT;
    if (!recipient) {
      console.warn('⚠  TEST_RECIPIENT no definido en .env.test — test omitido');
      return;
    }

    const result = await emailService.sendWelcomeEmail({
      name: 'Usuario de Prueba',
      email: recipient,
      verificationToken: 'token-de-prueba-integracion-abc123'
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
    expect(typeof result.messageId).toBe('string');
    console.log(`✅  Email enviado. MessageId: ${result.messageId}`);
  });

  // ── 3. sendEmail() con dirección malformada (rechazo local inmediato) ──────────────
  test('sendEmail() retorna success:false ante una dirección malformada (sin lanzar)', async () => {
    // Nota: Gmail acepta optímistamente dominios externos desconocidos en SMTP y
    // luego rebota por NDR — no rechaza en tiempo real.
    // Para probar el manejo de error local usamos una dirección sin "@",
    // que nodemailer rechaza antes de intentar la conexión.
    const result = await emailService.sendEmail({
      to: 'direccion-sin-arroba-invalida',
      subject: 'Test de dirección malformada',
      html: '<p>Test</p>'
    });

    // El servicio NO debe lanzar, solo devolver success:false
    expect(result.success).toBe(false);
    expect(result.message).toBeDefined();
    console.log(`✅  Error local manejado correctamente: "${result.message}"`);
  });

  // ── 4. Control: no tiene credenciales → isAvailable() false ───────────────
  test('isAvailable() devuelve false si SMTP_EMAIL está vacío', async () => {
    const original = process.env.SMTP_EMAIL;
    process.env.SMTP_EMAIL = '';

    // Forzar re-inicialización del transporter
    emailService._transporter = null;

    const available = await emailService.isAvailable();
    expect(available).toBe(false);

    // Restaurar
    process.env.SMTP_EMAIL = original;
    emailService._transporter = null;
  });
});
