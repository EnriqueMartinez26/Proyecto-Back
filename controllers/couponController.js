const Coupon = require('../models/Coupon');
const ErrorResponse = require('../utils/errorResponse');

// Crear Cupón (Admin)
exports.createCoupon = async (req, res, next) => {
    try {
        const coupon = await Coupon.create(req.body);
        res.status(201).json({ success: true, data: coupon });
    } catch (error) {
        next(error);
    }
};

// Obtener todos los cupones (Admin)
exports.getCoupons = async (req, res, next) => {
    try {
        const coupons = await Coupon.find().sort({ createdAt: -1 });
        res.json({ success: true, data: coupons });
    } catch (error) {
        next(error);
    }
};

// Validar cupón (Público - Checkout)
exports.validateCoupon = async (req, res, next) => {
    try {
        const { code } = req.params;
        const { cartTotal } = req.query;

        const coupon = await Coupon.findOne({ code: code.toUpperCase() });

        if (!coupon) {
            throw new ErrorResponse('Cupón no encontrado', 404);
        }

        const validation = coupon.isValid();
        if (!validation.valid) {
            throw new ErrorResponse(validation.reason, 400);
        }

        if (cartTotal && coupon.minPurchase > parseFloat(cartTotal)) {
            throw new ErrorResponse(`Compra mínima requerida: $${coupon.minPurchase}`, 400);
        }

        res.json({
            success: true,
            data: {
                code: coupon.code,
                discountType: coupon.discountType,
                value: coupon.value,
                minPurchase: coupon.minPurchase
            }
        });
    } catch (error) {
        next(error);
    }
};

// Usar cupón (llamado después de una compra exitosa)
exports.useCoupon = async (code) => {
    const coupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (coupon) {
        coupon.usedCount += 1;
        await coupon.save();
    }
};

// Eliminar cupón (Admin)
exports.deleteCoupon = async (req, res, next) => {
    try {
        const coupon = await Coupon.findByIdAndDelete(req.params.id);
        if (!coupon) throw new ErrorResponse('Cupón no encontrado', 404);
        res.json({ success: true, message: 'Cupón eliminado' });
    } catch (error) {
        next(error);
    }
};
