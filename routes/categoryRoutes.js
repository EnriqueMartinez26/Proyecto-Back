const express = require('express');
const router = express.Router();
const {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  deleteCategories
} = require('../controllers/categoryController');

const { protect, authorize } = require('../middlewares/auth');

router.get('/', getCategories);
router.get('/:id', getCategory);

// Rutas protegidas
router.post('/', protect, authorize('admin'), createCategory);
router.put('/:id', protect, authorize('admin'), updateCategory);
router.delete('/multi', protect, authorize('admin'), deleteCategories);
router.delete('/:id', protect, authorize('admin'), deleteCategory);

module.exports = router;