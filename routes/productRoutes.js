const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  deleteProducts,
  reorderProduct
} = require('../controllers/productController');
const { protect, authorize } = require('../middlewares/auth');

router.get('/', getProducts);
router.get('/:id', getProduct);

router.post('/', protect, authorize('admin'), createProduct);
router.put('/:id/reorder', protect, authorize('admin'), reorderProduct);
router.put('/:id', protect, authorize('admin'), updateProduct);
router.delete('/multi', protect, authorize('admin'), deleteProducts);
router.delete('/:id', protect, authorize('admin'), deleteProduct);

module.exports = router;