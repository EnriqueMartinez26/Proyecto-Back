const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const { getWishlist, toggleWishlist } = require('../controllers/wishlistController');

// Rutas de wishlist protegidas
router.get('/', protect, getWishlist);
router.post('/toggle', protect, toggleWishlist);

module.exports = router;
