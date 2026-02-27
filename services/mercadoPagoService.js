const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * MercadoPagoService — Encapsula toda la comunicación con la API de MercadoPago.
 *
 * Soporta modo dual: sandbox (pruebas) y production (pagos reales).
 * La variable MERCADOPAGO_ENV controla el comportamiento:
 *   - 'sandbox'    → usa MERCADOPAGO_SANDBOX_TOKEN + sandbox_init_point
 *   - 'production' → usa MERCADOPAGO_ACCESS_TOKEN + init_point
 *
 * ─── Configuración de credenciales ───
 *
 * 1. Ir a https://www.mercadopago.com.ar/developers/panel/app
 * 2. Crear una aplicación (o usar una existente)
 * 3. En "Credenciales de prueba":
 *    → Copiar Access Token → MERCADOPAGO_SANDBOX_TOKEN
 * 4. En "Credenciales de producción":
 *    → Copiar Access Token → MERCADOPAGO_ACCESS_TOKEN
 * 5. La Public Key NO se necesita (usamos Checkout Pro redirect, no Bricks)
 * 6. En "Webhooks":
 *    → Configurar URL: https://tu-dominio.com/api/orders/webhook
 *    → Copiar Secret Key → MERCADOPAGO_WEBHOOK_SECRET
 *    → Seleccionar evento: "Pagos" (payment)
 *
 * Variables de entorno requeridas:
 *   MERCADOPAGO_ENV=sandbox | production
 *   MERCADOPAGO_SANDBOX_TOKEN=TEST-xxxx        (modo sandbox)
 *   MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxxx       (modo production)
 *   MERCADOPAGO_WEBHOOK_SECRET=xxxx             (validación HMAC)
 */
class MercadoPagoService {
  constructor() {
    this._client = null;
    this._env = null;
  }

  /** @returns {'sandbox'|'production'} */
  get env() {
    if (!this._env) {
      this._env = process.env.MERCADOPAGO_ENV === 'production' ? 'production' : 'sandbox';
    }
    return this._env;
  }

  get isSandbox() {
    return this.env === 'sandbox';
  }

  /**
   * Devuelve el cliente MP configurado (singleton lazy).
   * Selecciona el token según el entorno.
   */
  getClient() {
    if (!this._client) {
      const token = this.isSandbox
        ? (process.env.MERCADOPAGO_SANDBOX_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN)
        : process.env.MERCADOPAGO_ACCESS_TOKEN;

      if (!token) {
        throw new Error(
          `Token de MercadoPago no configurado. ` +
          `Configurá ${this.isSandbox ? 'MERCADOPAGO_SANDBOX_TOKEN' : 'MERCADOPAGO_ACCESS_TOKEN'} en .env`
        );
      }

      this._client = new MercadoPagoConfig({
        accessToken: token,
        options: { timeout: 5000 }
      });

      logger.info(`MercadoPago inicializado en modo: ${this.env}`);
    }
    return this._client;
  }

  /**
   * Crea una preferencia de pago (Checkout Pro).
   * @param {string} orderId    - ID de la orden local (external_reference)
   * @param {Array}  items      - Items validados [{ title, quantity, unit_price, currency_id }]
   * @param {string} backendUrl - URL pública del backend (ngrok en dev, dominio en prod)
   * @returns {{ id: string, paymentLink: string }} Preference ID y link de pago
   */
  async createPreference(orderId, items, backendUrl) {
    const client = this.getClient();
    const preferenceApi = new Preference(client);

    const response = await preferenceApi.create({
      body: {
        items,
        back_urls: {
          success: `${backendUrl}/api/orders/feedback?status=approved`,
          failure: `${backendUrl}/api/orders/feedback?status=failure`,
          pending: `${backendUrl}/api/orders/feedback?status=pending`
        },
        auto_return: 'approved',
        external_reference: orderId,
        statement_descriptor: '4FUN',
        notification_url: `${backendUrl}/api/orders/webhook`,
        expires: true,
        expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }
    });

    // Seleccionar el link según el entorno
    const paymentLink = this.isSandbox ? response.sandbox_init_point : response.init_point;

    return { id: response.id, paymentLink };
  }

  /**
   * Obtiene los datos de un pago por su ID.
   * @param {string} paymentId
   * @returns {Object} Datos del pago de MP
   */
  async getPayment(paymentId) {
    const client = this.getClient();
    const paymentApi = new Payment(client);
    return paymentApi.get({ id: paymentId });
  }

  /**
   * Valida la firma HMAC-SHA256 del webhook de MP.
   * En production lanza error si la firma es inválida.
   * En sandbox solo emite warning y continúa.
   * @param {Object} headers - Cabeceras HTTP del webhook
   * @param {string} dataId  - ID del dato (payment ID)
   */
  validateWebhookSignature(headers, dataId) {
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
    const xSignature = headers['x-signature'];

    if (!secret || !xSignature) return;

    let ts, receivedHash;
    xSignature.split(',').forEach(part => {
      const [key, value] = part.trim().split('=');
      if (key === 'ts') ts = value;
      if (key === 'v1') receivedHash = value;
    });

    if (!ts || !receivedHash) {
      if (!this.isSandbox) throw new Error('Firma de webhook malformada.');
      logger.warn('Firma de webhook malformada (continuando en sandbox)');
      return;
    }

    const requestId = headers['x-request-id'] || '';
    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
    const expectedHash = crypto
      .createHmac('sha256', secret)
      .update(manifest)
      .digest('hex');

    if (receivedHash !== expectedHash) {
      if (!this.isSandbox) throw new Error('Firma de webhook inválida.');
      logger.warn('Firma de webhook inválida (continuando en sandbox)');
    }
  }
}

module.exports = new MercadoPagoService();
