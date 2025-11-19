const Wishlist = require('../models/Wishlist');

// Obtener wishlist
exports.getWishlist = async (req, res) => {
  try {
    let wishlist = await Wishlist.findOne({ usuarioId: req.params.userId })
      .populate('productos.productoId');
    
    if (!wishlist) {
      return res.json({ success: true, wishlist: [] });
    }
    
    // Filtrar productos que hayan sido eliminados de la BD
    const productosValidos = wishlist.productos
      .filter(item => item.productoId !== null)
      .map(item => item.productoId);
    
    res.json({ success: true, wishlist: productosValidos });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Alternar (Agregar/Quitar)
exports.toggleWishlist = async (req, res) => {
  try {
    const { userId, productId } = req.body;
    
    let wishlist = await Wishlist.findOne({ usuarioId: userId });

    if (!wishlist) {
      // Crear nueva
      wishlist = await Wishlist.create({
        usuarioId: userId,
        productos: [{ productoId: productId }]
      });
      return res.json({ success: true, action: 'added', message: 'Añadido a favoritos' });
    }

    // Verificar existencia
    const existsIndex = wishlist.productos.findIndex(
      p => p.productoId.toString() === productId
    );

    if (existsIndex > -1) {
      // Quitar
      wishlist.productos.splice(existsIndex, 1);
      await wishlist.save();
      return res.json({ success: true, action: 'removed', message: 'Eliminado de favoritos' });
    } else {
      // Agregar
      wishlist.productos.push({ productoId: productId });
      await wishlist.save();
      return res.json({ success: true, action: 'added', message: 'Añadido a favoritos' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};