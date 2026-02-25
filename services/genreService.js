const Genre = require('../models/Genre');
const createMetadataService = require('./metadataService');

const service = createMetadataService(Genre, {
    singular: 'género',
    plural: 'géneros',
    notFoundMsg: 'Género no encontrado',
    productField: 'generoId',
});

exports.getGenres = service.getAll.bind(service);
exports.getGenreById = service.getById.bind(service);
exports.createGenre = service.create.bind(service);
exports.updateGenre = service.update.bind(service);
exports.deleteGenre = service.deleteOne.bind(service);
exports.deleteGenres = service.deleteMany.bind(service);
