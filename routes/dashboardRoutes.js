const express = require('express');
const router = express.Router();
const { getStats, getSalesChart, getTopProducts, getRecentSales } = require('../controllers/dashboardController');
const { protect, authorize } = require('../middlewares/auth');

router.use(protect);
router.use(authorize('admin'));

router.get('/stats', getStats);
router.get('/chart', getSalesChart);
router.get('/top-products', getTopProducts);
router.get('/recent-sales', getRecentSales);

module.exports = router;
