const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

// ─────────────────────────────────────────────────────────────────────────────
// EmailService — Envío de correos transaccionales via Gmail SMTP (Nodemailer)
// ─────────────────────────────────────────────────────────────────────────────
//
// Configuración de credenciales Gmail:
//
// 1. Tener una cuenta de Google con verificación en 2 pasos activa
// 2. Ir a https://myaccount.google.com/apppasswords
// 3. Generar una "Contraseña de aplicación" para "Correo"
// 4. Copiar la contraseña de 16 caracteres → SMTP_PASSWORD en .env
// 5. Configurar SMTP_EMAIL con tu dirección de Gmail
//
// Variables de entorno:
//   SMTP_EMAIL=tu-gmail@gmail.com
//   SMTP_PASSWORD=xxxx xxxx xxxx xxxx   (contraseña de aplicación)
//   CONTACT_ADMIN_EMAIL=tu-gmail@gmail.com  (para recibir formularios de contacto)
// ─────────────────────────────────────────────────────────────────────────────

/** Número máximo de reintentos al enviar un email. */
const MAX_RETRIES = 3;
/** Base de milisegundos para la espera exponencial entre reintentos. */
const RETRY_BASE_MS = 1000;

class EmailService {
  constructor() {
    this._transporter = null;
    this._fromEmail = null;
    this._fromName = '4Fun Store';
  }

  /**
   * Inicializa el transporter de Nodemailer de forma lazy.
   * Usa pool de conexiones para reutilizar sockets SMTP.
   */
  _getTransporter() {
    if (!this._transporter) {
      const email = process.env.SMTP_EMAIL;
      const password = process.env.SMTP_PASSWORD;

      if (!email || !password) {
        logger.warn('EmailService: SMTP_EMAIL o SMTP_PASSWORD no configuradas. Los emails no se enviarán.');
        return null;
      }

      this._transporter = nodemailer.createTransport({
        service: 'gmail',
        pool: true,           // Reutiliza conexiones TCP (evita handshake TLS por cada email)
        maxConnections: 3,    // Gmail permite ~3 conexiones simultáneas por cuenta
        maxMessages: 100,     // Mensajes por conexión antes de reconectar
        auth: {
          user: email,
          pass: password
        }
      });

      this._fromEmail = email;
      logger.info('EmailService: Transporter Gmail inicializado (pool: true, maxConn: 3)', {
        from: `${this._fromName} <${this._fromEmail}>`
      });
    }
    return this._transporter;
  }

  /** Indica si el servicio está listo para enviar correos. */
  isAvailable() {
    return this._getTransporter() !== null;
  }

  /** Convierte HTML a texto plano (fallback). */
  _htmlToText(html) {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Espera un tiempo exponencial antes de reintentar.
   * @param {number} attempt - Número de intento (0-indexed)
   */
  _delay(attempt) {
    const ms = RETRY_BASE_MS * Math.pow(2, attempt);
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Método base para enviar correos con reintentos automáticos.
   * @param {Object} options
   * @param {string} options.to      - Destinatario
   * @param {string} options.subject - Asunto
   * @param {string} options.html    - Cuerpo HTML
   * @returns {Promise<{success: boolean, messageId?: string, message?: string}>}
   */
  async sendEmail({ to, subject, html }) {
    const transporter = this._getTransporter();
    if (!transporter) {
      return { success: false, message: 'Servicio de email no configurado' };
    }

    const mailOptions = {
      from: `${this._fromName} <${this._fromEmail}>`,
      to,
      subject,
      html,
      text: this._htmlToText(html)
    };

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const info = await transporter.sendMail(mailOptions);
        logger.info('EmailService: Correo enviado', { to, subject, messageId: info.messageId, attempt });
        return { success: true, messageId: info.messageId };

      } catch (error) {
        const isRetryable = error.responseCode >= 400 || error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT';
        const isLastAttempt = attempt === MAX_RETRIES;

        if (isLastAttempt || !isRetryable) {
          logger.error('EmailService: Error definitivo al enviar', {
            to, subject, error: error.message, attempt, code: error.code
          });
          return { success: false, message: error.message };
        }

        logger.warn(`EmailService: Reintentando (${attempt + 1}/${MAX_RETRIES})...`, {
          to, error: error.message
        });
        await this._delay(attempt);
      }
    }

    return { success: false, message: 'Máximo de reintentos alcanzado' };
  }

  /**
   * Envía el correo de bienvenida con el token de verificación de cuenta.
   * Se llama al registrar un nuevo usuario.
   * @param {Object} params
   * @param {string} params.name              - Nombre del usuario
   * @param {string} params.email             - Email del usuario
   * @param {string} params.verificationToken - Token para verificar la cuenta
   */
  async sendWelcomeEmail({ name, email, verificationToken }) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const verifyUrl = `${frontendUrl}/verificar-email?token=${verificationToken}`;
    const year = new Date().getFullYear();

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenido a 4Fun</title>
</head>
<body style="margin:0;padding:0;background-color:#0f0f23;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0f0f23;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0"
          style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.4);">

          <!-- Encabezado -->
          <tr>
            <td style="background:linear-gradient(90deg,#667eea 0%,#764ba2 100%);padding:40px;text-align:center;">
              <h1 style="margin:0;font-size:34px;font-weight:700;color:#fff;letter-spacing:2px;">4FUN</h1>
              <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.8);text-transform:uppercase;letter-spacing:3px;">
                Tu tienda de videojuegos
              </p>
            </td>
          </tr>

          <!-- Contenido principal -->
          <tr>
            <td style="padding:50px 40px 30px;">
              <h2 style="margin:0 0 18px;font-size:26px;font-weight:600;color:#fff;">
                ¡Bienvenido/a, ${name}!
              </h2>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#a0a0b9;">
                Tu cuenta en <strong style="color:#667eea;">4Fun Store</strong> fue creada correctamente.
                Para activarla y empezar a comprar, confirmá tu dirección de correo haciendo clic en el botón de abajo.
              </p>

              <div style="background:rgba(102,126,234,0.1);border-left:4px solid #667eea;padding:18px 20px;border-radius:0 8px 8px 0;margin-bottom:30px;">
                <p style="margin:0;font-size:14px;color:#c0c0d9;">
                  <strong style="color:#667eea;">Email registrado:</strong><br>
                  <span style="color:#fff;">${email}</span>
                </p>
              </div>

              <!-- Botón de verificación -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 30px;">
                <tr>
                  <td style="border-radius:8px;background:linear-gradient(90deg,#667eea 0%,#764ba2 100%);">
                    <a href="${verifyUrl}" target="_blank"
                      style="display:inline-block;padding:16px 40px;font-size:15px;font-weight:600;color:#fff;text-decoration:none;letter-spacing:0.5px;">
                      Verificar mi cuenta
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#6b6b80;line-height:1.6;">
                Si el botón no funciona, copiá y pegá este enlace en tu navegador:<br>
                <span style="color:#667eea;word-break:break-all;">${verifyUrl}</span>
              </p>
            </td>
          </tr>

          <!-- Beneficios -->
          <tr>
            <td style="padding:0 40px 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td width="32%" style="padding:14px;text-align:center;background:rgba(255,255,255,0.03);border-radius:10px;">
                    <div style="font-size:26px;margin-bottom:8px;">🎮</div>
                    <div style="font-size:12px;color:#a0a0b9;">Catálogo extenso</div>
                  </td>
                  <td width="4%"></td>
                  <td width="32%" style="padding:14px;text-align:center;background:rgba(255,255,255,0.03);border-radius:10px;">
                    <div style="font-size:26px;margin-bottom:8px;">🔒</div>
                    <div style="font-size:12px;color:#a0a0b9;">Compras seguras</div>
                  </td>
                  <td width="4%"></td>
                  <td width="32%" style="padding:14px;text-align:center;background:rgba(255,255,255,0.03);border-radius:10px;">
                    <div style="font-size:26px;margin-bottom:8px;">⚡</div>
                    <div style="font-size:12px;color:#a0a0b9;">Entrega inmediata</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Pie de página -->
          <tr>
            <td style="background:rgba(0,0,0,0.25);padding:28px 40px;text-align:center;border-top:1px solid rgba(255,255,255,0.05);">
              <p style="margin:0 0 10px;font-size:12px;color:#6b6b80;">
                © ${year} 4Fun Store. Todos los derechos reservados.
              </p>
              <p style="margin:0;font-size:11px;color:#4a4a5c;">
                Si no creaste esta cuenta, podés ignorar este correo.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    return this.sendEmail({
      to: email,
      subject: '¡Bienvenido/a a 4Fun! Verificá tu cuenta',
      html
    });
  }

  /**
   * Envía las claves de activación digital al usuario tras un pago aprobado.
   * @param {Object} user  - { name, email }
   * @param {Object} order - Objeto de orden (con _id)
   * @param {Array}  keys  - [{ productName, key }]
   */
  async sendDigitalProductDelivery(user, order, keys) {
    const { name, email } = user;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const orderRef = order._id.toString().slice(-6).toUpperCase();

    const keysRows = keys.map(k => `
      <tr style="border-bottom:1px solid rgba(255,255,255,0.08);">
        <td style="padding:14px 16px;color:#e0e0e0;font-size:14px;">${k.productName}</td>
        <td style="padding:14px 16px;text-align:right;">
          <code style="background:rgba(102,126,234,0.15);color:#8fa8f4;padding:7px 12px;border-radius:6px;font-family:monospace;font-size:15px;letter-spacing:1px;border:1px solid rgba(102,126,234,0.3);">
            ${k.key}
          </code>
        </td>
      </tr>`).join('');

    const year = new Date().getFullYear();

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tus keys de 4Fun</title>
</head>
<body style="margin:0;padding:0;background-color:#0f0f23;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0f0f23;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0"
          style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.4);">

          <!-- Encabezado -->
          <tr>
            <td style="background:linear-gradient(90deg,#667eea 0%,#764ba2 100%);padding:36px 40px;text-align:center;">
              <h1 style="margin:0;font-size:26px;font-weight:700;color:#fff;">¡Tu entrega digital llegó!</h1>
              <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.8);text-transform:uppercase;letter-spacing:2px;">
                Orden #${orderRef}
              </p>
            </td>
          </tr>

          <!-- Saludo -->
          <tr>
            <td style="padding:36px 40px 24px;">
              <p style="margin:0 0 20px;font-size:15px;color:#a0a0b9;line-height:1.7;">
                Hola <strong style="color:#fff;">${name}</strong>, gracias por tu compra en 4Fun Store.
                A continuación encontrás tus claves de activación. ¡A jugar!
              </p>
            </td>
          </tr>

          <!-- Tabla de claves -->
          <tr>
            <td style="padding:0 40px 30px;">
              <table width="100%" cellspacing="0" cellpadding="0"
                style="background:rgba(255,255,255,0.03);border-radius:10px;overflow:hidden;">
                <thead>
                  <tr style="background:rgba(255,255,255,0.06);">
                    <th style="padding:12px 16px;text-align:left;color:#a0a0b9;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Producto</th>
                    <th style="padding:12px 16px;text-align:right;color:#a0a0b9;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Clave de activación</th>
                  </tr>
                </thead>
                <tbody>
                  ${keysRows}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Instrucciones -->
          <tr>
            <td style="padding:0 40px 30px;">
              <div style="background:rgba(255,193,7,0.08);border-left:4px solid #ffc107;padding:14px 18px;border-radius:0 8px 8px 0;">
                <p style="margin:0;font-size:13px;color:#e0e0e0;line-height:1.6;">
                  <strong style="color:#ffc107;">Instrucciones:</strong>
                  Copiá la clave y activala en la plataforma correspondiente (Steam, Epic Games, etc.).
                  Guardá este correo como comprobante.
                </p>
              </div>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:0 40px 40px;text-align:center;">
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;">
                <tr>
                  <td style="border-radius:8px;background:linear-gradient(90deg,#667eea 0%,#764ba2 100%);">
                    <a href="${frontendUrl}/account" target="_blank"
                      style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:600;color:#fff;text-decoration:none;">
                      Ver mis órdenes
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Pie de página -->
          <tr>
            <td style="background:rgba(0,0,0,0.25);padding:24px 40px;text-align:center;border-top:1px solid rgba(255,255,255,0.05);">
              <p style="margin:0;font-size:12px;color:#6b6b80;">
                © ${year} 4Fun Store · ¿Dudas? Respondé este correo o visitá nuestro soporte.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    return this.sendEmail({
      to: email,
      subject: `Tus keys de 4Fun — Orden #${orderRef}`,
      html
    });
  }

  /**
   * Envía una notificación al administrador cuando alguien usa el formulario de contacto.
   * @param {Object} params
   * @param {string} params.fullName - Nombre completo del remitente
   * @param {string} params.email    - Email del remitente
   * @param {string} params.message  - Mensaje del remitente
   */
  async sendContactNotification({ fullName, email, message }) {
    const adminEmail = process.env.CONTACT_ADMIN_EMAIL || process.env.SMTP_EMAIL;

    if (!adminEmail) {
      logger.warn('EmailService: No hay email de administrador configurado (CONTACT_ADMIN_EMAIL)');
      return { success: false, message: 'Email de administrador no configurado' };
    }

    const year = new Date().getFullYear();
    const timestamp = new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nuevo mensaje de contacto</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f5f5f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0"
          style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.1);">

          <!-- Encabezado -->
          <tr>
            <td style="background:linear-gradient(90deg,#667eea 0%,#764ba2 100%);padding:30px 36px;text-align:center;">
              <h1 style="margin:0;font-size:20px;font-weight:700;color:#fff;">
                📬 Nuevo mensaje de contacto
              </h1>
              <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.8);">4Fun Store — Panel de administración</p>
            </td>
          </tr>

          <!-- Datos del remitente -->
          <tr>
            <td style="padding:32px 36px 20px;">
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding:10px 14px;background:#f9f9fc;border-radius:8px 8px 0 0;border-bottom:1px solid #eee;">
                    <span style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Nombre</span><br>
                    <strong style="font-size:15px;color:#1a1a2e;">${fullName}</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 14px;background:#f9f9fc;border-bottom:1px solid #eee;">
                    <span style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Email</span><br>
                    <a href="mailto:${email}" style="font-size:15px;color:#667eea;text-decoration:none;">${email}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 14px;background:#f9f9fc;border-bottom:1px solid #eee;">
                    <span style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Fecha</span><br>
                    <span style="font-size:14px;color:#333;">${timestamp}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Mensaje -->
          <tr>
            <td style="padding:0 36px 32px;">
              <p style="margin:0 0 10px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Mensaje</p>
              <div style="background:#f4f4f8;border-left:4px solid #667eea;padding:18px 20px;border-radius:0 8px 8px 0;font-size:15px;color:#333;line-height:1.7;white-space:pre-wrap;">${message}</div>
            </td>
          </tr>

          <!-- Responder -->
          <tr>
            <td style="padding:0 36px 36px;text-align:center;">
              <a href="mailto:${email}?subject=Re: Tu consulta en 4Fun Store"
                style="display:inline-block;padding:12px 28px;background:linear-gradient(90deg,#667eea 0%,#764ba2 100%);color:#fff;text-decoration:none;border-radius:7px;font-size:14px;font-weight:600;">
                Responder a ${fullName}
              </a>
            </td>
          </tr>

          <!-- Pie -->
          <tr>
            <td style="background:#f9f9fc;padding:20px 36px;text-align:center;border-top:1px solid #eee;">
              <p style="margin:0;font-size:12px;color:#aaa;">
                © ${year} 4Fun Store · Este correo fue generado automáticamente.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    return this.sendEmail({
      to: adminEmail,
      subject: `Contacto Web: Mensaje de ${fullName}`,
      html
    });
  }
}

module.exports = new EmailService();
