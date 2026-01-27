const express = require('express');
const { protect } = require('../middlewares/auth');
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
} = require('../controllers/cartController');

const router = express.Router();

// Todas las rutas del carrito requieren autenticación
router.get('/:userId', protect, getCart);
router.post('/', protect, addToCart);
router.put('/', protect, updateCartItem);
router.delete('/:userId/:itemId', protect, removeFromCart);
router.delete('/:userId', protect, clearCart);

module.exports = router;
