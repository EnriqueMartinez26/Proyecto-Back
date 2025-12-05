const Order = require('../models/Order');
const Product = require('../models/Product');
const { MercadoPagoConfig, Preference } = require('mercadopago');

// Inicialización Lazy del cliente de MP (se ejecuta al primer uso)
let mpClient = null;
const getMpClient = () => {
  if (!mpClient) {
    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      throw new Error("MERCADOPAGO_ACCESS_TOKEN no configurado en .env");
    }
    mpClient = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });
  }
  return mpClient;
};

class OrderService {
  async createOrder({ user, orderItems, shippingAddress, paymentMethod, totalPrice }) {
    // 1. Validar Stock y Recalcular Totales (Seguridad)
    if (!orderItems || orderItems.length === 0) throw new Error('No hay items');

    let calculatedTotal = 0;
    const validatedItems = [];

    // Verificación atómica de inventario
    for (const item of orderItems) {
      const product = await Product.findById(item.product);
      if (!product) throw new Error(`Producto no encontrado: ${item.name}`);
      
      if (product.stock < item.quantity) {
        throw new Error(`Stock insuficiente para: ${product.nombre}`);
      }
      
      // Usamos el precio real de la BD, no el que manda el frontend
      calculatedTotal += product.precio * item.quantity;
      
      validatedItems.push({
        ...item,
        price: product.precio,
        name: product.nombre,
        description: product.descripcion?.substring(0, 200) // MP tiene límite de longitud
      });
    }

    // 2. Descontar Stock (Reserva)
    // Nota: Si el pago falla, deberíamos tener un cron job o webhook que devuelva el stock.
    // Por simplicidad en MVP, descontamos ahora.
    for (const item of validatedItems) {
        await Product.findByIdAndUpdate(item.product, {
            $inc: { stock: -item.quantity, cantidadVendida: item.quantity }
        });
    }

    // 3. Crear Orden en Base de Datos (Estado: pendiente_pago)
    const order = await Order.create({
      user,
      orderItems: validatedItems,
      shippingAddress,
      paymentMethod,
      itemsPrice: calculatedTotal,
      totalPrice: calculatedTotal, // + envío si hubiera
      orderStatus: 'pendiente_pago',
      isPaid: false
    });

    // 4. Generar Preferencia de Mercado Pago
    const client = getMpClient();
    const preference = new Preference(client);

    const preferenceData = {
      body: {
        items: validatedItems.map(item => ({
          id: item.product.toString(),
          title: item.name,
          quantity: Number(item.quantity),
          unit_price: Number(item.price),
          currency_id: 'ARS', // Cambiar según tu país (MXN, USD, etc)
          picture_url: item.image
        })),
        payer: {
          // Aquí podrías agregar email del usuario real si lo tienes disponible en 'user'
          // email: user.email 
        },
        back_urls: {
          success: `${process.env.FRONTEND_URL}/checkout/success`,
          failure: `${process.env.FRONTEND_URL}/checkout/failure`,
          pending: `${process.env.FRONTEND_URL}/checkout/pending`
        },
        auto_return: 'approved',
        external_reference: order._id.toString(), // <--- EL DATO MÁS IMPORTANTE
        statement_descriptor: "4FUN GAMES",
        // notification_url: `${process.env.BACKEND_URL}/api/orders/webhook` // Habilitar cuando tengamos HTTPS/Ngrok
      }
    };

    const mpResponse = await preference.create(preferenceData);

    // 5. Guardar ID de preferencia en la orden para referencia
    order.externalId = mpResponse.id;
    await order.save();

    // Retornamos la orden y el link de pago (init_point)
    return { 
      order, 
      paymentLink: mpResponse.init_point 
    };
  }
}

module.exports = new OrderService();
