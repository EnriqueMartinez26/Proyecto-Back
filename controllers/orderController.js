const OrderService = require('../services/orderService');
const Order = require('../models/Order');
const DigitalKey = require('../models/DigitalKey');

// Crear orden
exports.createOrder = async (req, res, next) => {
  try {
    const result = await OrderService.createOrder({
      user: req.user._id, 
      ...req.body
    });
    res.status(201).json({ 
      success: true,
      order: result.order,
      paymentLink: result.paymentLink 
    });
  } catch (error) { next(error); }
};

// Webhook
exports.receiveWebhook = async (req, res) => {
  try {
    await OrderService.handleWebhook(req.headers, req.body, req.query);
    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook Error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// Puente de Redirección (Ngrok -> Localhost)
exports.paymentFeedback = (req, res) => {
  const { status, payment_id, external_reference } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:9002';
  
  let redirectPath = '/checkout/pending';
  if (status === 'approved') redirectPath = '/checkout/success';
  else if (status === 'failure' || status === 'rejected') redirectPath = '/checkout/failure';

  const destination = new URL(`${frontendUrl}${redirectPath}`);
  if (payment_id) destination.searchParams.append('payment_id', payment_id);
  if (external_reference) destination.searchParams.append('external_reference', external_reference);
  
  console.log(`🔀 Redirigiendo usuario (Puente) a: ${destination.toString()}`);
  res.redirect(destination.toString());
};

// Obtener órdenes del usuario (Con Claves Digitales)
exports.getUserOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    // Adjuntar claves digitales si la orden está pagada
    const enrichedOrders = await Promise.all(orders.map(async (order) => {
      if (order.isPaid) {
        const keys = await DigitalKey.find({ pedidoId: order._id })
          .select('clave productoId')
          .lean();
        return { ...order, digitalKeys: keys };
      }
      return order;
    }));

    res.json({ success: true, count: enrichedOrders.length, orders: enrichedOrders });
  } catch (error) { next(error); }
};

// Métodos restantes (sin cambios de lógica, pero incluidos completos)
exports.getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email').populate('orderItems.product', 'name price');
    if (!order) return res.status(404).json({ success: false, message: 'Orden no encontrada' });
    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') return res.status(403).json({ success: false });
    res.json({ success: true, order });
  } catch (error) { next(error); }
};

exports.getAllOrders = async (req, res, next) => {
  try {
    const orders = await Order.find().populate('user', 'name email').sort({ createdAt: -1 });
    res.json({ success: true, count: orders.length, orders });
  } catch (error) { next(error); }
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'No encontrada' });
    order.orderStatus = req.body.status;
    await order.save();
    res.json({ success: true, order });
  } catch (error) { next(error); }
};

exports.updateOrderToPaid = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    order.isPaid = true; 
    order.paidAt = Date.now();
    await order.save();
    res.json({ success: true, order });
  } catch (error) { next(error); }
};