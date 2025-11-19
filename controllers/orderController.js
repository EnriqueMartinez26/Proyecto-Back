const Order = require('../models/Order');

// Crear orden
exports.createOrder = async (req, res) => {
  try {
    const {
      orderItems,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      shippingPrice,
      totalPrice,
      user
    } = req.body;

    if (orderItems && orderItems.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'No hay productos en la orden' 
      });
    }

    const order = await Order.create({
      user,
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
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Obtener orden por ID
exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email')
      .populate('orderItems.product', 'name price');
    
    if (!order) {
      return res.status(404).json({ 
        success: false,
        message: 'Orden no encontrada' 
      });
    }

    res.json({ 
      success: true, 
      order 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Obtener órdenes de un usuario
exports.getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.params.userId })
      .populate('orderItems.product', 'name price images')
      .sort({ createdAt: -1 });

    res.json({ 
      success: true, 
      count: orders.length,
      orders 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Obtener todas las órdenes (admin)
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    res.json({ 
      success: true, 
      count: orders.length,
      orders 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Actualizar estado de orden
exports.updateOrderStatus = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ 
        success: false,
        message: 'Orden no encontrada' 
      });
    }

    order.orderStatus = req.body.status || order.orderStatus;
    
    if (req.body.status === 'entregado') {
      order.isDelivered = true;
      order.deliveredAt = Date.now();
    }

    const updatedOrder = await order.save();

    res.json({ 
      success: true,
      message: 'Estado de orden actualizado',
      order: updatedOrder 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Actualizar orden a pagada
exports.updateOrderToPaid = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ 
        success: false,
        message: 'Orden no encontrada' 
      });
    }

    order.isPaid = true;
    order.paidAt = Date.now();
    order.paymentResult = {
      id: req.body.id,
      status: req.body.status,
      update_time: req.body.update_time
    };

    const updatedOrder = await order.save();

    res.json({ 
      success: true,
      message: 'Orden marcada como pagada',
      order: updatedOrder 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};
