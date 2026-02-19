const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth');
const couponController = require('../controllers/couponController');

// Rutas Admin (Protegidas)
router.post('/', protect, authorize('admin'), couponController.createCoupon);
router.get('/', protect, authorize('admin'), couponController.getCoupons);
router.delete('/:id', protect, authorize('admin'), couponController.deleteCoupon);

// Ruta Pública (Validación de cupón en checkout)
router.get('/validate/:code', couponController.validateCoupon);

module.exports = router;
