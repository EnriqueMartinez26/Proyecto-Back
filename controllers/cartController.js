const CartService = require('../services/cartService');

// Obtener carrito del usuario
exports.getCart = async (req, res, next) => {
  try {
    const cartResponse = await CartService.getCart(req.user.id);
    res.json({ success: true, cart: cartResponse });
  } catch (error) {
    next(error);
  }
};

// Agregar item al carrito
exports.addToCart = async (req, res, next) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.user.id;
    const populatedCart = await CartService.addToCart(userId, productId, quantity);
    res.json({ success: true, message: 'Agregado', cart: populatedCart });
  } catch (error) {
    next(error);
  }
};

// Actualizar cantidad
exports.updateCartItem = async (req, res, next) => {
  try {
    const { itemId, quantity } = req.body;
    const userId = req.user.id;
    const populatedCart = await CartService.updateCartItem(userId, itemId, quantity);
    res.json({ success: true, message: 'Actualizado', cart: populatedCart });
  } catch (error) {
    next(error);
  }
};

// Eliminar item
exports.removeFromCart = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const userId = req.user.id;
    const populatedCart = await CartService.removeFromCart(userId, itemId);
    res.json({ success: true, message: 'Eliminado', cart: populatedCart });
  } catch (error) {
    next(error);
  }
};

// Limpiar carrito
exports.clearCart = async (req, res, next) => {
  try {
    const cart = await CartService.clearCart(req.user.id);
    res.json({ success: true, message: 'Vaciado', cart });
  } catch (error) {
    next(error);
  }
};