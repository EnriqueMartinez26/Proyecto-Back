const Order = require('../models/Order');
const Product = require('../models/Product');
const DigitalKey = require('../models/DigitalKey');
const User = require('../models/User');
const mpService = require('./mercadoPagoService');
const EmailService = require('./emailService');
const { DEFAULT_IMAGE } = require('../utils/constants');
const logger = require('../utils/logger');
const ErrorResponse = require('../utils/errorResponse');

// ─────────────────────────────────────────────────────────────────────────────
// OrderService — lógica de negocio de órdenes
// ─────────────────────────────────────────────────────────────────────────────

class OrderService {

  /**
   * Crea una nueva orden y genera el link de pago de MercadoPago.
   * Flujo: validar stock → reservar stock → crear orden → crear preferencia MP
   * En caso de fallo en MP se hace rollback completo.
   */
  async createOrder({ user, orderItems, shippingAddress, paymentMethod }) {
    if (!orderItems?.length) {
      throw new ErrorResponse('El carrito está vacío.', 400);
    }

    const backendUrl = process.env.BACKEND_URL;
    if (!backendUrl) {
      throw new ErrorResponse('BACKEND_URL no está configurado en las variables de entorno.', 500);
    }

    // Paso 1: Validar productos y construir items para MP
    let calculatedTotal = 0;
    const validatedItems = [];

    for (const item of orderItems) {
      const product = await Product.findById(item.product);
      if (!product) {
        throw new ErrorResponse(`Producto no encontrado: ${item.name}`, 400);
      }

      if (product.tipo === 'Digital') {
        const availableKeys = await DigitalKey.countDocuments({
          productoId: item.product,
          estado: 'DISPONIBLE'
        });
        if (availableKeys < item.quantity) {
          throw new ErrorResponse(
            `Stock insuficiente de keys para: ${product.nombre} (Disponibles: ${availableKeys})`,
            400
          );
        }
      } else {
        if (product.stock < item.quantity) {
          throw new ErrorResponse(`Stock insuficiente para: ${product.nombre}`, 400);
        }
      }

      calculatedTotal += product.precio * item.quantity;

      validatedItems.push({
        id: item.product.toString(),
        title: item.name,
        quantity: Number(item.quantity),
        unit_price: Number(product.precio),
        currency_id: 'ARS',
        picture_url: item.image || undefined,
        description: product.descripcion?.substring(0, 200) || ''
      });
    }

    // Paso 2: Reservar stock ATÓMICAMENTE (previene race conditions)
    // Usamos findOneAndUpdate con condición de stock => si falla, otro comprador lo tomó primero.
    for (const item of validatedItems) {
      const updated = await Product.findOneAndUpdate(
        { _id: item.id, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity, cantidadVendida: item.quantity } },
        { new: true }
      );
      if (!updated) {
        // Rollback: devolver stock de items ya decrementados
        for (const prev of validatedItems) {
          if (prev.id === item.id) break; // Llegamos al que falló, dejar de hacer rollback
          await Product.findByIdAndUpdate(prev.id, {
            $inc: { stock: prev.quantity, cantidadVendida: -prev.quantity }
          });
        }
        throw new ErrorResponse(`Stock agotado para: ${item.title}. Otro usuario completó la compra antes.`, 409);
      }
    }

    // Paso 3: Crear orden en la base de datos
    const order = await Order.create({
      user,
      orderItems: validatedItems.map(i => ({
        product: i.id,
        name: i.title,
        quantity: i.quantity,
        price: i.unit_price,
        image: i.picture_url || ''
      })),
      shippingAddress,
      paymentMethod: paymentMethod || 'mercadopago',
      itemsPrice: calculatedTotal,
      totalPrice: calculatedTotal,
      orderStatus: 'pending',
      isPaid: false
    });

    // Paso 4: Crear preferencia en MercadoPago
    try {
      const mpResponse = await mpService.createPreference(
        order._id.toString(),
        validatedItems,
        backendUrl,
        user
      );

      order.externalId = mpResponse.id;
      await order.save();

      logger.info(`Orden ${order._id} creada. Link de pago generado (${mpService.env}).`);

      return { orderId: order._id, paymentLink: mpResponse.paymentLink, order };

    } catch (mpError) {
      // Rollback: devolver stock y eliminar la orden
      logger.error(`Error al crear preferencia MP para orden ${order._id}. Haciendo rollback.`, {
        error: mpError.message
      });
      for (const item of validatedItems) {
        await Product.findByIdAndUpdate(item.id, { $inc: { stock: item.quantity } });
      }
      await Order.findByIdAndDelete(order._id);
      throw new ErrorResponse(`Error al conectar con Mercado Pago: ${mpError.message}`, 502);
    }
  }

  /**
   * Procesa notificaciones webhook enviadas por MercadoPago.
   * Valida la firma, obtiene el pago, marca la orden como pagada
   * y entrega claves digitales si corresponde.
   */
  async handleWebhook(headers, body, query) {
    const dataId = body?.data?.id || query['data.id'];
    const type = body?.type || query.type;

    if (type !== 'payment') {
      return { status: 'ignored', reason: 'Tipo de notificación no es payment' };
    }

    if (!dataId) {
      throw new Error('Missing payment ID en el webhook');
    }

    // Validar firma HMAC
    mpService.validateWebhookSignature(headers, dataId);

    // Obtener datos del pago desde MP
    let paymentInfo;
    try {
      paymentInfo = await mpService.getPayment(dataId);
    } catch (err) {
      throw new Error(`No se pudo obtener el pago ${dataId} desde MercadoPago: ${err.message}`);
    }

    if (!paymentInfo) {
      throw new Error('Pago no encontrado en MercadoPago');
    }

    // Buscar la orden local por external_reference
    const order = await Order.findById(paymentInfo.external_reference).populate('orderItems.product');
    if (!order) {
      logger.warn(`Webhook recibido para orden inexistente: ${paymentInfo.external_reference}`);
      throw new Error('Orden no encontrada');
    }

    // Si ya está pagada, no procesar de nuevo (idempotencia)
    if (order.isPaid) {
      return { status: 'ok', reason: 'Orden ya procesada anteriormente' };
    }

    if (paymentInfo.status === 'approved') {
      // Marcar orden como pagada
      order.isPaid = true;
      order.paidAt = new Date();
      order.orderStatus = 'processing';
      order.paymentResult = {
        id: String(paymentInfo.id),
        status: 'approved',
        payment_type: paymentInfo.payment_type_id || '',
        email: paymentInfo.payer?.email || ''
      };

      // Entregar claves digitales
      const deliveredKeys = [];
      for (const item of order.orderItems) {
        if (item.product && item.product.tipo === 'Digital') {
          for (let i = 0; i < item.quantity; i++) {
            const key = await DigitalKey.findOneAndUpdate(
              { productoId: item.product._id, estado: 'DISPONIBLE' },
              { estado: 'VENDIDA', pedidoId: order._id, fechaVenta: new Date() },
              { new: true }
            );
            if (key) {
              deliveredKeys.push({ productName: item.product.nombre, key: key.clave });
              logger.info(`Clave asignada: ${key.clave} → Orden ${order._id}`);
            } else {
              logger.error(`Sin stock de keys para: ${item.product.nombre} en orden ${order._id}`);
            }
          }
        }
      }

      await order.save();

      // Enviar email con claves si hay productos digitales
      if (deliveredKeys.length > 0) {
        try {
          const user = await User.findById(order.user);
          if (user) {
            await EmailService.sendDigitalProductDelivery(user, order, deliveredKeys);
            logger.info(`Email de claves enviado a ${user.email} para orden ${order._id}`);
          }
        } catch (emailError) {
          logger.error('Error al enviar email de claves digitales:', emailError.message);
        }
      }

      logger.info(`Orden ${order._id} marcada como pagada (MP payment: ${paymentInfo.id})`);
    } else {
      logger.info(`Webhook recibido para orden ${order._id} con estado: ${paymentInfo.status}`);
    }

    return { status: 'ok', paymentStatus: paymentInfo.status };
  }

  /**
   * Obtiene las órdenes de un usuario enriquecidas con claves digitales si están pagadas.
   */
  async getUserOrders(userId) {
    const orders = await Order.find({ user: userId }).sort({ createdAt: -1 }).lean();

    const enrichedOrders = await Promise.all(
      orders.map(async order => {
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
      })
    );

    return enrichedOrders;
  }

  /**
   * Obtiene una orden por ID validando que el solicitante sea el dueño o un admin.
   */
  async getOrderById(orderId, userId, userRole) {
    const order = await Order.findById(orderId)
      .populate('user', 'name email')
      .populate('orderItems.product', 'name price');

    if (!order) {
      throw new ErrorResponse('Orden no encontrada', 404);
    }

    if (order.user._id.toString() !== userId && userRole !== 'admin') {
      throw new ErrorResponse('No autorizado para ver esta orden', 403);
    }

    return order;
  }

  /**
   * Lista todas las órdenes con filtros y paginación (admin).
   */
  async getAllOrders({ page = 1, limit = 10, status, userId } = {}) {
    const filter = {};
    if (status) filter.orderStatus = status;
    if (userId) filter.user = userId;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Order.countDocuments(filter)
    ]);

    return {
      count: orders.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      orders
    };
  }

  /**
   * Actualiza el estado de una orden.
   */
  async updateOrderStatus(orderId, status) {
    const order = await Order.findById(orderId);
    if (!order) throw new ErrorResponse('Orden no encontrada', 404);

    order.orderStatus = status;
    await order.save();
    return order;
  }

  /**
   * Marca manualmente una orden como pagada (uso admin).
   */
  async updateOrderToPaid(orderId) {
    const order = await Order.findById(orderId);
    if (!order) throw new ErrorResponse('Orden no encontrada', 404);

    order.isPaid = true;
    order.paidAt = new Date();
    await order.save();
    return order;
  }
}

module.exports = new OrderService();
