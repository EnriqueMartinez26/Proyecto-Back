const Cart = require('../models/Cart');
const ProductService = require('../services/productService');
const logger = require('../utils/logger');

// Campos necesarios para pasar la validación Zod en el Frontend
const PRODUCT_FIELDS = 'nombre precio imagenUrl stock plataformaId generoId tipo descripcion desarrollador fechaLanzamiento calificacion';

// Helper para obtener carrito con DTOs unificados
async function getCartWithDTO(userId) {
  const cart = await Cart.findOne({ user: userId })
    .populate({
      path: 'items.product',
      select: PRODUCT_FIELDS,
      populate: [
        { path: 'plataformaId', select: 'nombre' },
        { path: 'generoId', select: 'nombre' }
      ]
    });

  if (!cart) return { items: [] };

  const transformedItems = cart.items.map(item => {
    if (!item.product) return item;
    const productDTO = ProductService.transformDTO(item.product);
    const itemObj = item.toObject ? item.toObject() : item;
    return { ...itemObj, product: productDTO };
  });

  const cartResponse = cart.toObject ? cart.toObject() : cart;
  cartResponse.items = transformedItems;
  return cartResponse;
}

// Obtener carrito del usuario
exports.getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.params.userId })
      .populate({
        path: 'items.product',
        select: PRODUCT_FIELDS,
        populate: [ // Necesitamos poblar plataforma y genero para el DTO
          { path: 'plataformaId', select: 'nombre' },
          { path: 'generoId', select: 'nombre' }
        ]
      });

    if (!cart) {
      return res.json({ success: true, cart: { items: [] } });
    }

    // Transformar items usando el DTO unificado
    const transformedItems = cart.items.map(item => {
      if (!item.product) return item; // O filtrar/manejar items rotos

      // El DTO espera el doc del producto, lo transformamos
      const productDTO = ProductService.transformDTO(item.product);

      // Retornamos la estructura del item del carrito conservando cantidad, etc.
      // Pero reemplazando el objeto 'product' 'crudo' con el DTO
      const itemObj = item.toObject ? item.toObject() : item;
      return {
        ...itemObj,
        product: productDTO
      };
    });

    // Construimos respuesta de carrito manteniendo compatibilidad
    const cartResponse = cart.toObject ? cart.toObject() : cart;
    cartResponse.items = transformedItems;

    res.json({ success: true, cart: cartResponse });
  } catch (error) {
    logger.error('Error al obtener carrito:', error);
    res.status(500).json({ message: 'Error al obtener carrito', error: error.message });
  }
};

// Agregar item al carrito
exports.addToCart = async (req, res) => {
  try {
    const { userId, productId, quantity } = req.body;

    let cart = await Cart.findOne({ user: userId });

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

    // Popular respuesta completa usando helper DTO
    const populatedCart = await getCartWithDTO(userId);

    res.json({ success: true, message: 'Agregado', cart: populatedCart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Actualizar cantidad
exports.updateCartItem = async (req, res) => {
  try {
    const { userId, itemId, quantity } = req.body;
    const cart = await Cart.findOne({ user: userId });

    if (!cart) return res.status(404).json({ message: 'Carrito no encontrado' });

    const item = cart.items.id(itemId);
    if (!item) return res.status(404).json({ message: 'Item no encontrado' });

    item.quantity = quantity;
    await cart.save();

    const populatedCart = await getCartWithDTO(userId);

    res.json({ success: true, message: 'Actualizado', cart: populatedCart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Eliminar item
exports.removeFromCart = async (req, res) => {
  try {
    const { userId, itemId } = req.params;
    const cart = await Cart.findOne({ user: userId });

    if (!cart) return res.status(404).json({ message: 'Carrito no encontrado' });

    cart.items = cart.items.filter(item => item._id.toString() !== itemId);
    await cart.save();

    const populatedCart = await getCartWithDTO(userId);

    res.json({ success: true, message: 'Eliminado', cart: populatedCart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Limpiar carrito
exports.clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.params.userId });
    if (!cart) return res.status(404).json({ message: 'Carrito no encontrado' });

    cart.items = [];
    await cart.save();
    res.json({ success: true, message: 'Vaciado', cart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};