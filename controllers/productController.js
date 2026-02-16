const ProductService = require('../services/productService');

exports.getProducts = async (req, res, next) => {
  try {
    const { search, platform, genre, minPrice, maxPrice, page, limit, sort } = req.query;

    const result = await ProductService.getProducts({
      search,
      platform,
      genre,
      minPrice,
      maxPrice,
      page,
      limit,
      sort
    });

    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
};

exports.getProduct = async (req, res, next) => {
  try {
    const product = await ProductService.getProductById(req.params.id);
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

exports.createProduct = async (req, res, next) => {
  try {
    const product = await ProductService.createProduct(req.body);
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const product = await ProductService.updateProduct(req.params.id, req.body);
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

exports.reorderProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { direction } = req.body; // 'up' or 'down'

    if (!['up', 'down'].includes(direction)) {
      const error = new Error('Dirección inválida');
      error.statusCode = 400;
      throw error;
    }

    const success = await ProductService.reorderProduct(id, direction);

    if (!success) {
      return res.status(400).json({ success: false, message: 'No se pudo mover el producto (límite alcanzado)' });
    }

    res.status(200).json({ success: true, message: 'Producto reordenado' });
  } catch (error) {
    next(error);
  }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    await ProductService.deleteProduct(req.params.id);
    res.status(200).json({ success: true, message: 'Producto eliminado' });
  } catch (error) {
    next(error);
  }
};

exports.deleteProducts = async (req, res, next) => {
  try {
    let ids = [];

    if (Array.isArray(req.body) && req.body.length > 0) {
      ids = req.body;
    } else if (req.body.ids && Array.isArray(req.body.ids)) {
      ids = req.body.ids;
    } else if (req.query.ids) {
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
