const Category = require('../models/Category');

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
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
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
