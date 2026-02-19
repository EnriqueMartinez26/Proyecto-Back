const Wishlist = require('../models/Wishlist');
const ProductService = require('../services/productService');
const logger = require('../utils/logger');

exports.getWishlistByUser = async (userId) => {
    let wishlist = await Wishlist.findOne({ usuarioId: userId })
        .populate({
            path: 'productos.productoId',
            populate: [
                { path: 'platformObj' },
                { path: 'genreObj' }
            ]
        });

    if (!wishlist) return [];

    const productos = wishlist.productos
        .filter(item => item.productoId)
        .map(item => ProductService.transformDTO(item.productoId));

    logger.info(`Wishlist obtenida para usuario: ${userId}`);
    return productos;
};

exports.toggleWishlist = async (userId, productId) => {
    let wishlist = await Wishlist.findOne({ usuarioId: userId });

    if (!wishlist) {
        wishlist = await Wishlist.create({ usuarioId: userId, productos: [{ productoId: productId }] });
        logger.info(`Wishlist creada y producto agregado: ${userId}`);
    } else {
        const idx = wishlist.productos.findIndex(p => p.productoId.toString() === productId);
        if (idx > -1) {
            wishlist.productos.splice(idx, 1);
            logger.info(`Producto removido de wishlist: ${userId}`);
        } else {
            wishlist.productos.push({ productoId: productId });
            logger.info(`Producto agregado a wishlist: ${userId}`);
        }
        await wishlist.save();
    }

    return true;
};
