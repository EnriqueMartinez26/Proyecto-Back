const Order = require('../models/Order');
const OrderService = require('../services/orderService');

// Crear orden y preferencia de pago
exports.createOrder = async (req, res, next) => {
  try {
    const {
      orderItems,
      shippingAddress,
      paymentMethod,
      totalPrice
    } = req.body;

    // Delegamos al servicio. El ID de usuario viene del middleware de auth (token)
    const result = await OrderService.createOrder({
      user: req.user._id, 
      orderItems,
      shippingAddress,
      paymentMethod,
      totalPrice
    });

    res.status(201).json({ 
      success: true,
      message: 'Orden creada e intención de pago generada',
      order: result.order,
      paymentLink: result.paymentLink // <--- URL para redirigir al usuario
    });
  } catch (error) {
    next(error);
  }
};

// ... (Resto de los métodos se mantienen igual, solo los volvemos a escribir para mantener el archivo completo) ...

exports.getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email')
      .populate('orderItems.product', 'name price');
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Orden no encontrada' });
    }

    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
       return res.status(403).json({ success: false, message: 'No autorizado' });
    }

    res.json({ success: true, order });
  } catch (error) { next(error); }
};

exports.getUserOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, count: orders.length, orders });
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
    if (!order) return res.status(404).json({ success: false, message: 'Orden no encontrada' });

    order.orderStatus = req.body.status || order.orderStatus;
    if (req.body.status === 'entregado') {
      order.isDelivered = true;
      order.deliveredAt = Date.now();
    }
    const updatedOrder = await order.save();
    res.json({ success: true, order: updatedOrder });
  } catch (error) { next(error); }
};

exports.updateOrderToPaid = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Orden no encontrada' });

    order.isPaid = true;
    order.paidAt = Date.now();
    order.orderStatus = 'pagado'; // Actualizamos estado también
    const updatedOrder = await order.save();
    res.json({ success: true, order: updatedOrder });
  } catch (error) { next(error); }
};
