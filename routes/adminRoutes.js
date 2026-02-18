const express = require('express');
const router = express.Router();
const { getDashboardStats } = require('../controllers/adminController');
const { protect, authorize } = require('../middlewares/auth');

// Dashboard Analytics (Admin Only)
router.get('/dashboard', protect, authorize('admin'), getDashboardStats);

// RUTA TEMPORAL (SEED)

module.exports = router;
