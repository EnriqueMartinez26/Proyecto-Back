const Cart = require('../models/Cart');

// Obtener carrito del usuario
exports.getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.params.userId })
      .populate('items.product', 'name price images stock');
    
    if (!cart) {
      return res.json({ 
        success: true, 
        cart: { items: [] } 
      });
    }

    res.json({ 
      success: true, 
      cart 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Agregar item al carrito
exports.addToCart = async (req, res) => {
  try {
    const { userId, productId, quantity, size, color } = req.body;

    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      // Crear nuevo carrito
      cart = await Cart.create({
        user: userId,
        items: [{ product: productId, quantity, size, color }]
      });
    } else {
      // Verificar si el producto ya está en el carrito
      const itemIndex = cart.items.findIndex(
        item => item.product.toString() === productId && 
                item.size === size && 
                item.color === color
      );

      if (itemIndex > -1) {
        // Actualizar cantidad
        cart.items[itemIndex].quantity += quantity;
      } else {
        // Agregar nuevo item
        cart.items.push({ product: productId, quantity, size, color });
      }

      cart.updatedAt = Date.now();
      await cart.save();
    }

    const populatedCart = await Cart.findById(cart._id)
      .populate('items.product', 'name price images stock');

    res.json({ 
      success: true,
      message: 'Producto agregado al carrito',
      cart: populatedCart 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Actualizar cantidad de item
exports.updateCartItem = async (req, res) => {
  try {
    const { userId, itemId, quantity } = req.body;

    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      return res.status(404).json({ 
        success: false,
        message: 'Carrito no encontrado' 
      });
    }

    const item = cart.items.id(itemId);
    if (!item) {
      return res.status(404).json({ 
        success: false,
        message: 'Item no encontrado en el carrito' 
      });
    }

    item.quantity = quantity;
    cart.updatedAt = Date.now();
    await cart.save();

    const populatedCart = await Cart.findById(cart._id)
      .populate('items.product', 'name price images stock');

    res.json({ 
      success: true,
      message: 'Cantidad actualizada',
      cart: populatedCart 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Eliminar item del carrito
exports.removeFromCart = async (req, res) => {
  try {
    const { userId, itemId } = req.params;

    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      return res.status(404).json({ 
        success: false,
        message: 'Carrito no encontrado' 
      });
    }

    cart.items = cart.items.filter(item => item._id.toString() !== itemId);
    cart.updatedAt = Date.now();
    await cart.save();

    const populatedCart = await Cart.findById(cart._id)
      .populate('items.product', 'name price images stock');

    res.json({ 
      success: true,
      message: 'Producto eliminado del carrito',
      cart: populatedCart 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Limpiar carrito
exports.clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.params.userId });

    if (!cart) {
      return res.status(404).json({ 
        success: false,
        message: 'Carrito no encontrado' 
      });
    }

    cart.items = [];
    cart.updatedAt = Date.now();
    await cart.save();

    res.json({ 
      success: true,
      message: 'Carrito vaciado',
      cart 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};
