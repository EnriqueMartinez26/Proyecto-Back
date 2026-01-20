const OrderService = require('../services/orderService');
const Order = require('../models/Order');
const DigitalKey = require('../models/DigitalKey');
const { DEFAULT_IMAGE } = require('../utils/constants');

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
    // Si es error de validación (ej: falta ID), devolver 400 para que MP no reintente
    if (error.message === 'Missing payment ID' || error.message === 'Pago no encontrado') {
      return res.status(400).json({ error: error.message });
    }
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
    // If userId param is present, use it (Admin or specific user logic could go here)
    // For now, we allow passing it. If strict security needed, we'd check req.user.role === 'admin'
    const targetUserId = req.params.userId || req.user._id;

    // Security check: User can only see their own orders unless admin
    if (req.user.role !== 'admin' && targetUserId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }

    const enrichedOrders = await OrderService.getUserOrders(targetUserId);
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

// List all orders (Admin) with Pagination & Filters
exports.getAllOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, userId } = req.query;
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

    res.json({
      success: true,
      count: orders.length,
      total: count,
      page: pageNum,
      totalPages: Math.ceil(count / limitNum),
      orders
    });
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