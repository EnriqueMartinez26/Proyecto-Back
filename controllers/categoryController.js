const CategoryService = require('../services/categoryService');

// Obtener todas las categorías
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await CategoryService.getCategories();
    res.json({
      success: true,
      count: categories.length,
      categories
    });
  } catch (error) {
    next(error);
  }
};

// Obtener categoría por ID
exports.getCategory = async (req, res, next) => {
  try {
    const category = await CategoryService.getCategoryById(req.params.id);
    res.json({ success: true, category });
  } catch (error) {
    next(error);
  }
};

// Crear categoría
exports.createCategory = async (req, res, next) => {
  try {
    const category = await CategoryService.createCategory(req.body);
    res.status(201).json({
      success: true,
      message: 'Categoría creada exitosamente',
      category
    });
  } catch (error) {
    next(error);
  }
};

// Actualizar categoría
exports.updateCategory = async (req, res, next) => {
  try {
    const category = await CategoryService.updateCategory(req.params.id, req.body);
    res.json({
      success: true,
      message: 'Categoría actualizada exitosamente',
      category
    });
  } catch (error) {
    next(error);
  }
};

// Eliminar categoría
exports.deleteCategory = async (req, res, next) => {
  try {
    await CategoryService.deleteCategory(req.params.id);
    res.json({
      success: true,
      message: 'Categoría eliminada exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

// Eliminar múltiples categorías
exports.deleteCategories = async (req, res, next) => {
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

    const result = await CategoryService.deleteCategories(ids);

    res.json({
      success: true,
      message: `${result.deletedCount} categorías eliminadas`,
      ids
    });
  } catch (error) {
    next(error);
  }
};
