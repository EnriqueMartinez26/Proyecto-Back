const Order = require('../models/Order');
const Product = require('../models/Product');
const DigitalKey = require('../models/DigitalKey');
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const crypto = require('crypto');
const logger = require('../utils/logger');

let mpClient = null;
const getMpClient = () => {
  if (!mpClient) {
    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      throw new Error("FATAL: MERCADOPAGO_ACCESS_TOKEN no configurado.");
    }
    mpClient = new MercadoPagoConfig({
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
      options: { timeout: 5000 }
    });
  }
  return mpClient;
};

class OrderService {
  async createOrder({ user, orderItems, shippingAddress, paymentMethod }) {
    if (!orderItems?.length) throw new Error('El carrito está vacío.');

    // 1. Validaciones
    let calculatedTotal = 0;
    const validatedItems = [];

    for (const item of orderItems) {
      const product = await Product.findById(item.product);
      if (!product) throw new Error(`Producto no encontrado: ${item.name}`);
      if (product.stock < item.quantity) throw new Error(`Stock insuficiente: ${product.nombre}`);

      calculatedTotal += product.precio * item.quantity;

      validatedItems.push({
        id: item.product.toString(),
        title: item.name,
        quantity: Number(item.quantity),
        unit_price: Number(product.precio),
        currency_id: 'ARS',
        picture_url: item.image,
        description: product.descripcion?.substring(0, 200)
      });
    }

    // 2. Reserva de Stock
    for (const item of validatedItems) {
      await Product.findByIdAndUpdate(item.id, {
        $inc: { stock: -item.quantity, cantidadVendida: item.quantity }
      });
    }

    // 3. Crear Orden Local
    const order = await Order.create({
      user,
      orderItems: validatedItems.map(i => ({ ...i, product: i.id, name: i.title, price: i.unit_price })),
      shippingAddress,
      paymentMethod,
      itemsPrice: calculatedTotal,
      totalPrice: calculatedTotal,
      totalPrice: calculatedTotal,
      orderStatus: 'pending',
      isPaid: false
    });

    // 4. Preferencia MP (Checkout Pro)
    try {
      const client = getMpClient();
      const preference = new Preference(client);

      const backendUrl = process.env.BACKEND_URL;
      if (!backendUrl) throw new Error("BACKEND_URL (Ngrok) es requerida en .env");

      const preferenceData = {
        body: {
          items: validatedItems,
          back_urls: {
            success: `${backendUrl}/api/orders/feedback?status=approved`,
            failure: `${backendUrl}/api/orders/feedback?status=failure`,
            pending: `${backendUrl}/api/orders/feedback?status=pending`
          },
          auto_return: 'approved',
          external_reference: order._id.toString(),
          statement_descriptor: "4FUN",
          notification_url: `${backendUrl}/api/orders/webhook`,
          expires: true,
          expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }
      };

      const mpResponse = await preference.create(preferenceData);

      order.externalId = mpResponse.id;
      await order.save();

      // --- CONFIGURACIÓN DE ENTORNO ---
      // En modo desarrollo, utilizamos el sandbox_init_point para permitir pruebas
      const link = process.env.NODE_ENV === 'production'
        ? mpResponse.init_point
        : mpResponse.sandbox_init_point;

      return {
        orderId: order._id, // Requirement: return orderId
        paymentLink: link,
        order // Return full order too just in case
      };

      return { order, paymentLink: link };

    } catch (error) {
      // Rollback
      for (const item of validatedItems) {
        await Product.findByIdAndUpdate(item.id, { $inc: { stock: item.quantity } });
      }
      await Order.findByIdAndDelete(order._id);
      throw new Error(`Error Mercado Pago: ${error.message}`);
    }
  }

  // Obtener órdenes de usuario con lógica de negocio (Claves, Imágenes)
  async getUserOrders(userId) {
    const orders = await Order.find({ user: userId })
      .sort({ createdAt: -1 })
      .lean();

    const { DEFAULT_IMAGE } = require('../utils/constants');

    // Adjuntar claves digitales si la orden está pagada y asegurar imagenes
    const enrichedOrders = await Promise.all(orders.map(async (order) => {
      // Ensure items have images
      if (order.orderItems) {
        order.orderItems = order.orderItems.map(item => ({
          ...item,
          image: item.image || DEFAULT_IMAGE
        }));
      }

      if (order.isPaid) {
        const keys = await DigitalKey.find({ pedidoId: order._id })
          .select('clave productoId')
          .lean();
        return { ...order, digitalKeys: keys };
      }
      return order;
    }));

    return enrichedOrders;
  }

  // Webhook Handler
  async handleWebhook(headers, body, query) {
    const xSignature = headers['x-signature'];
    const dataId = body?.data?.id || query['data.id'];
    const type = body?.type || query.type;

    if (type !== 'payment') return { status: 'ignored' };
    if (!dataId) throw new Error('Missing payment ID');

    // Validación de Firma
    if (process.env.MERCADOPAGO_WEBHOOK_SECRET && xSignature) {
      const parts = xSignature.split(',');
      let ts, QH;
      parts.forEach(p => {
        const [k, v] = p.split('=');
        if (k === 'ts') ts = v;
        if (k === 'v1') QH = v;
      });
      const manifest = `id:${dataId};request-id:${headers['x-request-id']};ts:${ts};`;
      const hmac = crypto.createHmac('sha256', process.env.MERCADOPAGO_WEBHOOK_SECRET);
      const digest = hmac.update(manifest).digest('hex');
      if (QH !== digest) logger.warn('⚠️ Firma de webhook inválida (continuando en dev)');
    }

    const client = getMpClient();
    const payment = new Payment(client);
    const paymentInfo = await payment.get({ id: dataId });

    if (!paymentInfo) throw new Error('Pago no encontrado');

    const order = await Order.findById(paymentInfo.external_reference)
      .populate('orderItems.product');

    if (!order) throw new Error('Orden no encontrada');
    if (order.orderStatus === 'pagado') return { status: 'ok' };

    if (paymentInfo.status === 'approved') {
      order.isPaid = true;
      order.paidAt = new Date();
      order.orderStatus = 'processing';
      order.paymentResult = { id: String(paymentInfo.id), status: 'approved', email: paymentInfo.payer?.email };

      // Entrega de Claves
      logger.info(`📦 Procesando entrega digital para orden ${order._id}...`);
      for (const item of order.orderItems) {
        if (item.product && item.product.tipo === 'Digital') {
          for (let i = 0; i < item.quantity; i++) {
            const key = await DigitalKey.findOneAndUpdate(
              { productoId: item.product._id, estado: 'DISPONIBLE' },
              { estado: 'VENDIDA', pedidoId: order._id, fechaVenta: new Date() },
              { new: true }
            );
            if (key) logger.info(`🔑 Clave asignada: ${key.clave}`);
            else logger.error(`⚠️ SIN STOCK DIGITAL para: ${item.product.nombre}`);
          }
        }
      }

      await order.save();
    }

    return { status: 'ok', state: paymentInfo.status };
  }
}

module.exports = new OrderService();