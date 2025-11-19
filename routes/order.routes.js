const express = require('express');
const {
  createOrder,
  getOrder,
  getUserOrders,
  getAllOrders,
  updateOrderStatus,
  updateOrderToPaid
} = require('../controllers/orderController');

const router = express.Router();

router.post('/', createOrder);
router.get('/', getAllOrders);
router.get('/:id', getOrder);
router.get('/user/:userId', getUserOrders);
router.put('/:id/status', updateOrderStatus);
router.put('/:id/pay', updateOrderToPaid);

module.exports = router;
