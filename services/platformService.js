const Platform = require('../models/Platform');
const createMetadataService = require('./metadataService');

const service = createMetadataService(Platform, {
    singular: 'plataforma',
    plural: 'plataformas',
    notFoundMsg: 'Plataforma no encontrada',
    productField: 'plataformaId',
});

exports.getPlatforms = service.getAll.bind(service);
exports.getPlatformById = service.getById.bind(service);
exports.createPlatform = service.create.bind(service);
exports.updatePlatform = service.update.bind(service);
exports.deletePlatform = service.deleteOne.bind(service);
exports.deletePlatforms = service.deleteMany.bind(service);
