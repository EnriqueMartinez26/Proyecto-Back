const Category = require('../models/Category');
const logger = require('../utils/logger');

// Get all categories
exports.getCategories = async () => {
    const categories = await Category.find({ active: true });
    logger.info(`Categorías obtenidas: ${categories.length}`);
    return categories;
};

// Get category by ID
exports.getCategoryById = async (id) => {
    const category = await Category.findById(id);

    if (!category) {
        const error = new Error('Categoría no encontrada');
        error.statusCode = 404;
        throw error;
    }

    return category;
};

// Create category
exports.createCategory = async (data) => {
    const category = await Category.create(data);
    logger.info(`Categoría creada: ${category._id}`, { name: category.name });
    return category;
};

// Update category
exports.updateCategory = async (id, data) => {
    const category = await Category.findByIdAndUpdate(
        id,
        data,
        { new: true, runValidators: true }
    );

    if (!category) {
        const error = new Error('Categoría no encontrada');
        error.statusCode = 404;
        throw error;
    }

    logger.info(`Categoría actualizada: ${category._id}`);
    return category;
};

// Delete category
exports.deleteCategory = async (id) => {
    const category = await Category.findByIdAndDelete(id);

    if (!category) {
        const error = new Error('Categoría no encontrada');
        error.statusCode = 404;
        throw error;
    }

    logger.info(`Categoría eliminada: ${id}`);
    return true;
};

// Delete multiple categories
exports.deleteCategories = async (ids) => {
    if (!ids || ids.length === 0) {
        const error = new Error('No se proporcionaron IDs para eliminar');
        error.statusCode = 400;
        throw error;
    }

    const result = await Category.deleteMany({ _id: { $in: ids } });
    logger.info(`Categorías eliminadas: ${result.deletedCount}`, { ids });
    return result;
};
