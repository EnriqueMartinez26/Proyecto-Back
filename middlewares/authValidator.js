const { body, validationResult } = require('express-validator');

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            success: false, 
            message: 'Error de validación',
            errors: errors.array().map(e => e.msg) 
        });
    }
    next();
};

exports.registerValidation = [
    body('name')
        .trim()
        .notEmpty().withMessage('El nombre es requerido'),
    body('email')
        .isEmail().withMessage('Debe proporcionar un email válido')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
    validate
];

exports.loginValidation = [
    body('email').isEmail().withMessage('Email inválido'),
    body('password').notEmpty().withMessage('La contraseña es requerida'),
    validate
];