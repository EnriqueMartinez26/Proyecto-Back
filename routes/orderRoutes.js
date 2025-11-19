const express = require('express');
const router = express.Router();
const {
  createOrder,
  getOrder,
  getUserOrders,
  getAllOrders,
  updateOrderStatus,
  updateOrderToPaid
} = require('../controllers/orderController');

router.post('/', createOrder);
router.get('/', getAllOrders);
router.get('/myorders/:userId', getUserOrders);
router.get('/:id', getOrder);
router.put('/:id/pay', updateOrderToPaid);
router.put('/:id/deliver', updateOrderStatus);

module.exports = router;