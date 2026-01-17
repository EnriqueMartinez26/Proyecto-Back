const Wishlist = require('../models/Wishlist');
const ProductService = require('../services/productService');

exports.getWishlist = async (req, res) => {
  try {
    let wishlist = await Wishlist.findOne({ usuarioId: req.params.userId })
      .populate({
        path: 'productos.productoId',
        populate: [
          { path: 'plataformaId', select: 'nombre' },
          { path: 'generoId', select: 'nombre' }
        ]
      });

    if (!wishlist) return res.json({ success: true, wishlist: [] });

    const productos = wishlist.productos
      .filter(item => item.productoId)
      .map(item => ProductService.transformDTO(item.productoId));

    res.json({ success: true, wishlist: productos });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.toggleWishlist = async (req, res) => {
  try {
    const { userId, productId } = req.body;
    let wishlist = await Wishlist.findOne({ usuarioId: userId });
    if (!wishlist) {
      wishlist = await Wishlist.create({ usuarioId: userId, productos: [{ productoId: productId }] });
    } else {
      const idx = wishlist.productos.findIndex(p => p.productoId.toString() === productId);
      if (idx > -1) wishlist.productos.splice(idx, 1);
      else wishlist.productos.push({ productoId: productId });
      await wishlist.save();
    }
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};
