const Category = require('../models/Category');
const createMetadataService = require('./metadataService');

const service = createMetadataService(Category, {
    singular: 'categoría',
    plural: 'categorías',
    notFoundMsg: 'Categoría no encontrada',
});

exports.getCategories = service.getAll.bind(service);
exports.getCategoryById = service.getById.bind(service);
exports.createCategory = service.create.bind(service);
exports.updateCategory = service.update.bind(service);
exports.deleteCategory = service.deleteOne.bind(service);
exports.deleteCategories = service.deleteMany.bind(service);
