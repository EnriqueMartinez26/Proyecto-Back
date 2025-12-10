const Order = require('../models/Order');
const Product = require('../models/Product');
const DigitalKey = require('../models/DigitalKey');
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const crypto = require('crypto');

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
      orderItems: validatedItems.map(i => ({...i, product: i.id, name: i.title, price: i.unit_price})),
      shippingAddress,
      paymentMethod,
      itemsPrice: calculatedTotal,
      totalPrice: calculatedTotal,
      orderStatus: 'pendiente_pago',
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
          statement_descriptor: "GOLSTORE",
          notification_url: `${backendUrl}/api/orders/webhook`,
          expires: true,
          expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }
      };

      const mpResponse = await preference.create(preferenceData);

      order.externalId = mpResponse.id;
      await order.save();

      // --- FIX CRÍTICO: FORZAR SANDBOX EN DESARROLLO ---
      // Usamos sandbox_init_point para que MP acepte al Usuario de Prueba
      const link = process.env.NODE_ENV === 'production' 
          ? mpResponse.init_point 
          : mpResponse.sandbox_init_point;

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
      let ts,QH;
      parts.forEach(p => {
        const [k, v] = p.split('=');
        if (k === 'ts') ts = v;
        if (k === 'v1') QH = v;
      });
      const manifest = `id:${dataId};request-id:${headers['x-request-id']};ts:${ts};`;
      const hmac = crypto.createHmac('sha256', process.env.MERCADOPAGO_WEBHOOK_SECRET);
      const digest = hmac.update(manifest).digest('hex');
      if (QH !== digest) console.warn('⚠️ Firma de webhook inválida (continuando en dev)');
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
      order.orderStatus = 'pagado';
      order.paymentResult = { id: String(paymentInfo.id), status: 'approved', email: paymentInfo.payer?.email };
      
      // Entrega de Claves
      console.log(`📦 Procesando entrega digital para orden ${order._id}...`);
      for (const item of order.orderItems) {
        if (item.product && item.product.tipo === 'Digital') {
           for (let i = 0; i < item.quantity; i++) {
             const key = await DigitalKey.findOneAndUpdate(
               { productoId: item.product._id, estado: 'DISPONIBLE' },
               { estado: 'VENDIDA', pedidoId: order._id, fechaVenta: new Date() },
               { new: true }
             );
             if (key) console.log(`🔑 Clave asignada: ${key.clave}`);
             else console.error(`⚠️ SIN STOCK DIGITAL para: ${item.product.nombre}`);
           }
        }
      }

      await order.save();
    } 
    
    return { status: 'ok', state: paymentInfo.status };
  }
}

module.exports = new OrderService();