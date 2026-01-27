const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth');
const {
  getAllUsers,
  getUser,
  updateUser,
  deleteUser
} = require('../controllers/userController');

// Todas las rutas protegidas - Solo admin puede ver/modificar usuarios
router.get('/', protect, authorize('admin'), getAllUsers);
router.get('/:id', protect, authorize('admin'), getUser);
router.put('/:id', protect, updateUser); // Usuario puede modificar su propio perfil
router.delete('/:id', protect, authorize('admin'), deleteUser);

module.exports = router;