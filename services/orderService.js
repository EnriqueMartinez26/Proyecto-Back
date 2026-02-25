const Order = require('../models/Order');
const Product = require('../models/Product');
const DigitalKey = require('../models/DigitalKey');
const EmailService = require('./emailService'); // Importar EmailService
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const crypto = require('crypto');
const logger = require('../utils/logger');
const ErrorResponse = require('../utils/errorResponse');

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
    if (!orderItems?.length) throw new ErrorResponse('El carrito está vacío.', 400);

    // 1. Validaciones
    let calculatedTotal = 0;
    const validatedItems = [];

    for (const item of orderItems) {
      const product = await Product.findById(item.product);
      if (!product) throw new ErrorResponse(`Producto no encontrado: ${item.name}`, 400);
      if (!product) throw new ErrorResponse(`Producto no encontrado: ${item.name}`, 400);

      // STOCK CHECK CRÍTICO (Fase 1)
      if (product.tipo === 'Digital') {
        const realStock = await DigitalKey.countDocuments({ productoId: item.product, estado: 'DISPONIBLE' });
        if (realStock < item.quantity) {
          throw new ErrorResponse(`Stock insuficiente de keys para: ${product.nombre} (Disponibles: ${realStock})`, 400);
        }
      } else {
        // Fisico
        if (product.stock < item.quantity) throw new ErrorResponse(`Stock insuficiente: ${product.nombre}`, 400);
      }

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
        orderId: order._id,
        paymentLink: link,
        order
      };

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
      const deliveredKeys = []; // Acumulador para email
      for (const item of order.orderItems) {
        if (item.product && item.product.tipo === 'Digital') {
          for (let i = 0; i < item.quantity; i++) {
            const key = await DigitalKey.findOneAndUpdate(
              { productoId: item.product._id, estado: 'DISPONIBLE' },
              { estado: 'VENDIDA', pedidoId: order._id, fechaVenta: new Date() },
              { new: true }
            );
            if (key) {
              logger.info(`🔑 Clave asignada: ${key.clave}`);
              deliveredKeys.push({ productName: item.product.nombre, key: key.clave });
            } else {
              logger.error(`⚠️ SIN STOCK DIGITAL para: ${item.product.nombre}`);
            }
          }
        }
      }

      // Enviar Email con Keys (Phase 1)
      if (deliveredKeys.length > 0) {
        try {
          const user = await require('../models/User').findById(order.user);
          if (user) {
            await EmailService.sendDigitalProductDelivery(user, order, deliveredKeys);
            logger.info(`📧 Email de claves enviado a ${user.email}`);
          }
        } catch (emailError) {
          logger.error('Error enviando email de claves:', emailError);
        }
      }

      await order.save();
    }

    return { status: 'ok', state: paymentInfo.status };
  }

  // Obtener orden por ID con validación de permisos
  async getOrderById(orderId, userId, userRole) {
    const order = await Order.findById(orderId)
      .populate('user', 'name email')
      .populate('orderItems.product', 'name price');

    if (!order) {
      throw new ErrorResponse('Orden no encontrada', 404);
    }

    // Validar acceso: Solo admin o dueño de la orden
    if (order.user._id.toString() !== userId && userRole !== 'admin') {
      throw new ErrorResponse('No autorizado para ver esta orden', 403);
    }

    return order;
  }

  // Listar órdenes (Admin) con filtros y paginación
  async getAllOrders({ page = 1, limit = 10, status, userId }) {
    const filter = {};
    if (status) filter.orderStatus = status;
    if (userId) filter.user = userId;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));

    const orders = await Order.find(filter)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    const count = await Order.countDocuments(filter);

    return {
      count: orders.length,
      total: count,
      page: pageNum,
      totalPages: Math.ceil(count / limitNum),
      orders
    };
  }

  async updateOrderStatus(orderId, status) {
    const order = await Order.findById(orderId);
    if (!order) throw new ErrorResponse('Orden no encontrada', 404);

    order.orderStatus = status;
    await order.save();
    return order;
  }

  async updateOrderToPaid(orderId) {
    const order = await Order.findById(orderId);
    if (!order) throw new ErrorResponse('Orden no encontrada', 404);

    order.isPaid = true;
    order.paidAt = Date.now();
    await order.save();
    return order;
  }
}

module.exports = new OrderService();