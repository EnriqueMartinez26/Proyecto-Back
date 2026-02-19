const express = require('express');
const { protect, authorize } = require('../middlewares/auth');
const { addKeys, deleteKey, getKeysByProduct } = require('../controllers/keyController');

const router = express.Router();

// Todas las rutas requieren autenticación y rol de admin
router.use(protect);
router.use(authorize('admin'));

router.post('/bulk', addKeys);
router.delete('/:id', deleteKey);
router.get('/product/:productId', getKeysByProduct);

module.exports = router;
