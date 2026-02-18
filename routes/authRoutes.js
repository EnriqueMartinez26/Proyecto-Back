const express = require('express');
const router = express.Router();
const {
    register,
    login,
    getProfile,
    logout,
    verifyEmail // NUEVO
} = require('../controllers/authController');
const { protect } = require('../middlewares/auth');
const { registerValidation, loginValidation } = require('../middlewares/authValidator');

// Rutas públicas
router.get('/verify', verifyEmail);
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);

// Rutas protegidas
router.get('/profile', protect, getProfile);
router.post('/logout', protect, logout);

module.exports = router;

