const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: [true, 'El código del cupón es requerido'],
        unique: true,
        uppercase: true,
        trim: true
    },
    discountType: {
        type: String,
        enum: ['percentage', 'fixed'],
        required: true,
        default: 'percentage'
    },
    value: {
        type: Number,
        required: [true, 'El valor del descuento es requerido'],
        min: [0, 'El valor no puede ser negativo']
    },
    minPurchase: {
        type: Number,
        default: 0
    },
    usageLimit: {
        type: Number,
        default: null // null = unlimited
    },
    usedCount: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    expiryDate: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Índices
couponSchema.index({ code: 1 }, { unique: true });
couponSchema.index({ isActive: 1 });

// Virtual: Check if coupon is valid
couponSchema.methods.isValid = function () {
    if (!this.isActive) return { valid: false, reason: 'Cupón desactivado' };
    if (this.expiryDate && new Date() > this.expiryDate) return { valid: false, reason: 'Cupón expirado' };
    if (this.usageLimit !== null && this.usedCount >= this.usageLimit) return { valid: false, reason: 'Límite de uso alcanzado' };
    return { valid: true };
};

module.exports = mongoose.model('Coupon', couponSchema);
