const Cart = require('../models/Cart');

// Campos necesarios para pasar la validación Zod en el Frontend (Solución a $NaN)
const PRODUCT_FIELDS = 'nombre precio imagenUrl stock plataformaId generoId tipo descripcion desarrollador fechaLanzamiento calificacion';

// Obtener carrito del usuario
exports.getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.params.userId })
      .populate('items.product', PRODUCT_FIELDS);
    
    if (!cart) {
      return res.json({ success: true, cart: { items: [] } });
    }
    res.json({ success: true, cart });
  } catch (error) {
    console.error('Error al obtener carrito:', error);
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

    // Popular respuesta completa para evitar errores en frontend
    const populatedCart = await Cart.findById(cart._id)
       .populate('items.product', PRODUCT_FIELDS);

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

    const populatedCart = await Cart.findById(cart._id)
      .populate('items.product', PRODUCT_FIELDS);

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

    const populatedCart = await Cart.findById(cart._id)
      .populate('items.product', PRODUCT_FIELDS);

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