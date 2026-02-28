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
        .normalizeEmail({
            // ─── CRÍTICO: no quitar puntos en Hotmail/Outlook/Gmail ───
            // Por defecto normalizeEmail() elimina puntos del local-part,
            // lo cual es seguro en Gmail (ignora puntos) pero ROMPE Hotmail/Outlook
            // donde emartinez.03 ≠ emartinez03. Desactivamos la remoción de puntos
            // en todos los proveedores para preservar la dirección original del usuario.
            gmail_remove_dots: false,
            outlookdotcom_remove_subaddress: false,
            gmail_remove_subaddress: false
        }),
    body('password')
        .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
    validate
];

exports.loginValidation = [
    body('email')
        .isEmail().withMessage('Email inválido')
        .normalizeEmail({
            gmail_remove_dots: false,
            outlookdotcom_remove_subaddress: false,
            gmail_remove_subaddress: false
        }),
    body('password').notEmpty().withMessage('La contraseña es requerida'),
    validate
];