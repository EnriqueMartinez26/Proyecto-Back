const express = require('express');
const router = express.Router();
const { getStats, getSalesChart, getTopProducts } = require('../controllers/dashboardController');
const { protect, authorize } = require('../middlewares/auth');

// Todas las rutas requieren Admin
router.use(protect);
router.use(authorize('admin'));

router.get('/stats', getStats);
router.get('/chart', getSalesChart);
router.get('/top-products', getTopProducts);

module.exports = router;
