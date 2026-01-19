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

// Eliminar múltiples productos
exports.deleteProducts = async (req, res, next) => {
  try {
    let ids = [];

    // 1. Array en body directo
    if (Array.isArray(req.body) && req.body.length > 0) {
      ids = req.body;
    }
    // 2. Objeto con propiedad ids
    else if (req.body.ids && Array.isArray(req.body.ids)) {
      ids = req.body.ids;
    }
    // 3. Query param
    else if (req.query.ids) {
      ids = Array.isArray(req.query.ids)
        ? req.query.ids
        : req.query.ids.split(',').filter(Boolean);
    }

    if (!ids || ids.length === 0) {
      const error = new Error('No se proporcionaron IDs para eliminar');
      error.statusCode = 400;
      throw error;
    }

    const result = await ProductService.deleteProducts(ids);

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} productos eliminados`,
      ids
    });
  } catch (error) {
    next(error);
  }
};