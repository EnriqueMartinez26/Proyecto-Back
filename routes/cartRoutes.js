const express = require('express');
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
} = require('../controllers/cartController');

const router = express.Router();

router.get('/:userId', getCart);
router.post('/', addToCart);
router.put('/', updateCartItem);
router.delete('/:userId/:itemId', removeFromCart);
router.delete('/:userId', clearCart);

module.exports = router;
