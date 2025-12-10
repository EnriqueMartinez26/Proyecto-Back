const express = require('express');
const router = express.Router();
const { 
    register, 
    login, 
    getProfile, 
    logout 
} = require('../controllers/authController');
const { protect } = require('../middlewares/auth');

// Rutas públicas
router.post('/register', register);
router.post('/login', login);
const { registerValidation, loginValidation } = require('../middlewares/authValidator');
// Rutas protegidas
router.get('/profile', protect, getProfile);
router.post('/logout', protect, logout);

module.exports = router;
