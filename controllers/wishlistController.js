const WishlistService = require('../services/wishlistService');

exports.getWishlist = async (req, res, next) => {
  try {
    const wishlist = await WishlistService.getWishlistByUser(req.user.id);
    res.json({ success: true, wishlist });
  } catch (error) {
    next(error); // Usa el middleware de manejo de errores
  }
};

exports.toggleWishlist = async (req, res, next) => {
  try {
    const { productId } = req.body;
    const userId = req.user.id;
    await WishlistService.toggleWishlist(userId, productId);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};
