const Category = require('../models/Category');
const logger = require('../utils/logger');

// Obtener todas las categorías
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ active: true });
    res.json({
      success: true,
      count: categories.length,
      categories
    });
  } catch (error) {
    logger.error('Error al obtener categorías:', error);
    res.status(500).json({ message: 'Error al obtener categorías', error: error.message });
  }
};

// Obtener categoría por ID
exports.getCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }

    res.json({
      success: true,
      category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Crear categoría
exports.createCategory = async (req, res) => {
  try {
    const category = await Category.create(req.body);
    res.status(201).json({
      success: true,
      message: 'Categoría creada exitosamente',
      category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Actualizar categoría
exports.updateCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Categoría actualizada exitosamente',
      category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Eliminar categoría
exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Categoría eliminada exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
// Eliminar múltiples categorías
exports.deleteCategories = async (req, res) => {
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
      return res.status(400).json({
        success: false,
        message: 'No se proporcionaron IDs para eliminar'
      });
    }

    const result = await Category.deleteMany({ _id: { $in: ids } });

    res.json({
      success: true,
      message: `${result.deletedCount} categorías eliminadas`,
      ids
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
