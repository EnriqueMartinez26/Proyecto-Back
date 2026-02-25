const CategoryService = require('../services/categoryService');
const Category = require('../models/Category');
const parseBulkIds = require('../utils/parseBulkIds');

// Get all categories
exports.getCategories = async (req, res, next) => {
    try {
        const categories = await CategoryService.getCategories();
        res.status(200).json(categories);
    } catch (error) {
        next(error);
    }
};

// Get category by ID
exports.getCategory = async (req, res, next) => {
    try {
        const category = await CategoryService.getCategoryById(req.params.id);
        res.status(200).json({ success: true, data: category });
    } catch (error) {
        next(error);
    }
};

// Create category
exports.createCategory = async (req, res, next) => {
    try {
        const category = await CategoryService.createCategory(req.body);
        res.status(201).json(category);
    } catch (error) {
        next(error);
    }
};

// Update category (UPSERT - Update or Insert)
exports.updateCategory = async (req, res, next) => {
    try {
        const category = await CategoryService.updateCategory(req.params.id, req.body);
        res.status(200).json({ success: true, data: category });
    } catch (error) {
        next(error);
    }
};

// Delete category (Soft Delete)
exports.deleteCategory = async (req, res, next) => {
    try {
        await CategoryService.deleteCategory(req.params.id);
        res.status(200).json({ success: true, message: 'Categoría eliminada (Soft Delete)', id: req.params.id });
    } catch (error) {
        next(error);
    }
};

// Delete multiple categories (Hard Delete)
exports.deleteCategories = async (req, res) => {
    const ids = parseBulkIds(req);

    if (!ids || ids.length === 0) {
        return res.status(400).json({ success: false, message: 'No se proporcionaron IDs para eliminar' });
    }

    try {
        const result = await Category.deleteMany({ id: { $in: ids } });
        res.status(200).json({
            success: true,
            message: `${result.deletedCount} categorías eliminadas`,
            ids
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
