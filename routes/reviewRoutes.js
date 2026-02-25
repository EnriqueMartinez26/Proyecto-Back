const express = require('express');
const router = express.Router();
const {
  createReview,
  getProductReviews,
  getProductRatingStats,
  voteHelpful,
  deleteReview
} = require('../controllers/reviewController');
const { protect } = require('../middlewares/auth');

// Rutas por producto
router.post('/product/:productId', protect, createReview);
router.get('/product/:productId', getProductReviews);
router.get('/product/:productId/stats', getProductRatingStats);

// Rutas por reseña
router.post('/:id/helpful', protect, voteHelpful);
router.delete('/:id', protect, deleteReview);

module.exports = router;
