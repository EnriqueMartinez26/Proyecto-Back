const Order = require('../models/Order');
const Product = require('../models/Product');
const DigitalKey = require('../models/DigitalKey'); // <--- NUEVO IMPORT
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const crypto = require('crypto');

// ... (Mantén el código de getMpClient y createOrder igual hasta handleWebhook) ...
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
    // ... (Mantén createOrder exactamente como estaba) ...
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
    
          return { order, paymentLink: mpResponse.init_point };
    
        } catch (error) {
          for (const item of validatedItems) {
            await Product.findByIdAndUpdate(item.id, { $inc: { stock: item.quantity } });
          }
          await Order.findByIdAndDelete(order._id);
          throw new Error(`Error Mercado Pago: ${error.message}`);
        }
      }

  // Webhook Handler ACTUALIZADO con lógica de entrega digital
  async handleWebhook(headers, body, query) {
    const xSignature = headers['x-signature'];
    const dataId = body?.data?.id || query['data.id']; 
    const type = body?.type || query.type;

    if (type !== 'payment') return { status: 'ignored' };
    if (!dataId) throw new Error('Missing payment ID');

    // Validación de Firma (Opcional en dev, obligatoria en prod)
    if (process.env.MERCADOPAGO_WEBHOOK_SECRET && xSignature) {
        // ... (misma lógica de validación de firma que ya tenías)
    }

    const client = getMpClient();
    const payment = new Payment(client);
    const paymentInfo = await payment.get({ id: dataId });

    if (!paymentInfo) throw new Error('Pago no encontrado');

    // Popular los productos para saber si son Digitales o Físicos
    const order = await Order.findById(paymentInfo.external_reference)
      .populate('orderItems.product'); 

    if (!order) throw new Error('Orden no encontrada');
    if (order.orderStatus === 'pagado') return { status: 'ok' };

    if (paymentInfo.status === 'approved') {
      order.isPaid = true;
      order.paidAt = new Date();
      order.orderStatus = 'pagado';
      order.paymentResult = { 
        id: String(paymentInfo.id), 
        status: 'approved', 
        email: paymentInfo.payer?.email 
      };
      
      // --- LÓGICA DE ENTREGA DIGITAL ---
      console.log(`📦 Procesando entrega digital para orden ${order._id}...`);
      
      for (const item of order.orderItems) {
        // Verificamos si el producto es Digital (accediendo al objeto poblado)
        if (item.product && item.product.tipo === 'Digital') {
           // Necesitamos tantas claves como cantidad comprada
           for (let i = 0; i < item.quantity; i++) {
             // Buscar una clave DISPONIBLE para este producto de forma atómica
             const key = await DigitalKey.findOneAndUpdate(
               { productoId: item.product._id, estado: 'DISPONIBLE' },
               { 
                 estado: 'VENDIDA', 
                 pedidoId: order._id, 
                 fechaVenta: new Date() 
               },
               { new: true }
             );

             if (key) {
               console.log(`🔑 Clave asignada para ${item.product.nombre}: ${key.clave}`);
             } else {
               console.error(`⚠️ ALERTA: No hay stock de claves digitales para ${item.product.nombre}`);
               // Aquí podrías enviar un email al admin alertando falta de stock real
             }
           }
        }
      }
      // ----------------------------------

      await order.save();
    } 
    
    return { status: 'ok', state: paymentInfo.status };
  }
}

module.exports = new OrderService();