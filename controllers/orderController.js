const Order = require('../models/Order');
const OrderService = require('../services/orderService');

// Crear orden
exports.createOrder = async (req, res, next) => {
  try {
    const {
      orderItems,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      shippingPrice,
      totalPrice
    } = req.body;

    // Delegamos al servicio, pasando el ID del usuario AUTENTICADO (req.user._id)
    // Esto previene que un usuario cree órdenes a nombre de otro.
    const order = await OrderService.createOrder({
      user: req.user._id, 
      orderItems,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      shippingPrice,
      totalPrice
    });

    res.status(201).json({ 
      success: true,
      message: 'Orden creada exitosamente',
      order 
    });
  } catch (error) {
    // Delegar al middleware global de errores
    next(error);
  }
};

// Obtener orden por ID
exports.getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email')
      .populate('orderItems.product', 'name price');
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Orden no encontrada' });
    }

    // Seguridad: Verificar que la orden pertenezca al usuario o sea admin
    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
       return res.status(403).json({ success: false, message: 'No autorizado para ver esta orden' });
    }

    res.json({ success: true, order });
  } catch (error) {
    next(error);
  }
};

// Obtener órdenes del usuario autenticado
exports.getUserOrders = async (req, res, next) => {
  try {
    // Usamos req.user._id del token, ignorando cualquier ID que venga en la URL por seguridad
    const orders = await Order.find({ user: req.user._id })
      .populate('orderItems.product', 'name price imagenUrl')
      .sort({ createdAt: -1 });

    res.json({ 
      success: true, 
      count: orders.length,
      orders 
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Obtener todas
exports.getAllOrders = async (req, res, next) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: orders.length, orders });
  } catch (error) {
    next(error);
  }
};

// Actualizar estado (Admin)
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Orden no encontrada' });
    }

    order.orderStatus = req.body.status || order.orderStatus;
    
    if (req.body.status === 'entregado') {
      order.isDelivered = true;
      order.deliveredAt = Date.now();
    }

    const updatedOrder = await order.save();
    res.json({ success: true, message: 'Estado actualizado', order: updatedOrder });
  } catch (error) {
    next(error);
  }
};

// Pagar orden
exports.updateOrderToPaid = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Orden no encontrada' });
    }

    order.isPaid = true;
    order.paidAt = Date.now();
    order.paymentResult = {
      id: req.body.id,
      status: req.body.status,
      update_time: req.body.update_time
    };

    const updatedOrder = await order.save();
    res.json({ success: true, message: 'Orden pagada', order: updatedOrder });
  } catch (error) {
    next(error);
  }
};
