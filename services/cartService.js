const Cart = require('../models/Cart');
const Product = require('../models/Product');
const ProductService = require('../services/productService');
const ErrorResponse = require('../utils/errorResponse');
const logger = require('../utils/logger');

const PRODUCT_FIELDS = 'nombre precio imagenUrl stock plataformaId generoId tipo descripcion desarrollador fechaLanzamiento calificacion activo';

// Helper for unified DTO
async function getCartWithDTO(userId) {
    const cart = await Cart.findOne({ user: userId })
        .populate({
            path: 'items.product',
            select: PRODUCT_FIELDS,
        })
        .lean();

    if (!cart) return { items: [] };

    const transformedItems = cart.items.map(item => {
        if (!item.product) return item;
        const productDTO = ProductService.transformDTO(item.product);
        return { ...item, product: productDTO };
    });

    const cartResponse = { ...cart };
    cartResponse.items = transformedItems;
    return cartResponse;
}

exports.getCart = async (userId) => {
    return await getCartWithDTO(userId);
};

exports.addToCart = async (userId, productId, quantity) => {
    // Validar que el producto existe, está activo y tiene stock
    const product = await Product.findById(productId);
    if (!product) {
        throw new ErrorResponse('Producto no encontrado', 404);
    }
    if (!product.activo) {
        throw new ErrorResponse('Este producto ya no está disponible', 400);
    }

    // Verificar stock considerando cantidad ya en carrito
    let cart = await Cart.findOne({ user: userId });
    let currentQuantityInCart = 0;
    if (cart) {
        const existingItem = cart.items.find(p => p.product.toString() === productId);
        if (existingItem) {
            currentQuantityInCart = existingItem.quantity;
        }
    }

    const totalRequested = currentQuantityInCart + quantity;
    if (product.stock < totalRequested) {
        throw new ErrorResponse(`Stock insuficiente. Disponible: ${product.stock}, en carrito: ${currentQuantityInCart}`, 400);
    }

    if (!cart) {
        cart = await Cart.create({
            user: userId,
            items: [{ product: productId, quantity }]
        });
    } else {
        const itemIndex = cart.items.findIndex(p => p.product.toString() === productId);
        if (itemIndex > -1) {
            cart.items[itemIndex].quantity += quantity;
        } else {
            cart.items.push({ product: productId, quantity });
        }
        cart.updatedAt = Date.now();
        await cart.save();
    }

    logger.info(`Item agregado al carrito para usuario: ${userId}`);
    return await getCartWithDTO(userId);
};

exports.updateCartItem = async (userId, itemId, quantity) => {
    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
        throw new ErrorResponse('Carrito no encontrado', 404);
    }

    const item = cart.items.id(itemId);
    if (!item) {
        throw new ErrorResponse('Item no encontrado', 404);
    }

    item.quantity = quantity;
    await cart.save();

    logger.info(`Item actualizado en carrito para usuario: ${userId}`);
    return await getCartWithDTO(userId);
};

exports.removeFromCart = async (userId, itemId) => {
    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
        throw new ErrorResponse('Carrito no encontrado', 404);
    }

    cart.items = cart.items.filter(item => item._id.toString() !== itemId);
    await cart.save();

    logger.info(`Item eliminado del carrito para usuario: ${userId}`);
    return await getCartWithDTO(userId);
};

exports.clearCart = async (userId) => {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
        throw new ErrorResponse('Carrito no encontrado', 404);
    }

    cart.items = [];
    await cart.save();

    logger.info(`Carrito vaciado para usuario: ${userId}`);
    return cart;
};
