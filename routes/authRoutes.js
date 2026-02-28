const express = require('express');
const router = express.Router();
const {
    register,
    login,
    getProfile,
    updateProfile,
    changePassword,
    logout,
    verifyEmail,
    resendVerification
} = require('../controllers/authController');
const { protect } = require('../middlewares/auth');
const { registerValidation, loginValidation } = require('../middlewares/authValidator');

// Rutas públicas
router.get('/verify', verifyEmail);
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/resend-verification', resendVerification);

// Rutas protegidas
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.put('/password', protect, changePassword);
router.post('/logout', logout);

module.exports = router;

