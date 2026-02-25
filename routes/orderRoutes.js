const express = require('express');
const router = express.Router();
const {
  createOrder,
  getOrder,
  getUserOrders,
  getAllOrders,
  updateOrderStatus,
  updateOrderToPaid,
  receiveWebhook,
  paymentFeedback // <--- Importamos el puente
} = require('../controllers/orderController');
const { protect, authorize } = require('../middlewares/auth');

// Rutas PÚBLICAS para Mercado Pago (Webhook y Feedback)
router.post('/webhook', receiveWebhook);
router.get('/feedback', paymentFeedback); // <--- Nueva ruta pública

// Rutas Protegidas
router.post('/', protect, createOrder);
router.get('/', protect, authorize('admin'), getAllOrders);
router.get('/user', protect, getUserOrders);
router.get('/:id', protect, getOrder);
router.put('/:id/pay', protect, updateOrderToPaid);
router.patch('/:id/status', protect, authorize('admin'), updateOrderStatus); // New Requirement (PATCH)
router.put('/:id/deliver', protect, authorize('admin'), updateOrderStatus); // Legacy support

module.exports = router;
