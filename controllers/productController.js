const ProductService = require('../services/productService');

// Obtener todos los productos (con filtros y paginación)
exports.getProducts = async (req, res, next) => {
  try {
    const { search, platform, genre, minPrice, maxPrice, page, limit } = req.query;

    const result = await ProductService.getProducts({
      search,
      platform,
      genre,
      minPrice,
      maxPrice,
      page,
      limit
    });

    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
};

// Obtener producto por ID
exports.getProduct = async (req, res, next) => {
  try {
    const product = await ProductService.getProductById(req.params.id);
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

// Crear producto
exports.createProduct = async (req, res, next) => {
  try {
    const product = await ProductService.createProduct(req.body);
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

// Actualizar producto
exports.updateProduct = async (req, res, next) => {
  try {
    const product = await ProductService.updateProduct(req.params.id, req.body);
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

// Eliminar producto
exports.deleteProduct = async (req, res, next) => {
  try {
    await ProductService.deleteProduct(req.params.id);
    res.status(200).json({ success: true, message: 'Producto eliminado' });
  } catch (error) {
    next(error);
  }
};