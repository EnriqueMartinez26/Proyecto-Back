const Genre = require('../models/Genre');
const Product = require('../models/Product');
const logger = require('../utils/logger');

// Helper to map to DTO
const toDTO = (g) => ({
    id: g.id,
    name: g.nombre,
    imageId: g.imageId,
    active: g.activo
});

// Get all genres
exports.getGenres = async () => {
    const genres = await Genre.find({ activo: true });
    logger.info(`Géneros obtenidos: ${genres.length}`);
    return genres.map(toDTO);
};

// Get genre by ID
exports.getGenreById = async (id) => {
    let genre = await Genre.findOne({ id });

    if (!genre && id.match(/^[0-9a-fA-F]{24}$/)) {
        genre = await Genre.findById(id);
    }

    if (!genre) {
        const error = new Error('Género no encontrado');
        error.statusCode = 404;
        throw error;
    }

    return toDTO(genre);
};

// Create genre
exports.createGenre = async (data) => {
    const { id, name, imageId, active } = data;

    if (!id) {
        const error = new Error('El ID personalizado es requerido');
        error.statusCode = 400;
        throw error;
    }

    const existing = await Genre.findOne({ id });
    if (existing) {
        const error = new Error('Ya existe un género con ese ID');
        error.statusCode = 400;
        throw error;
    }

    const genre = await Genre.create({
        id,
        nombre: name,
        imageId,
        activo: active !== undefined ? active : true
    });

    logger.info(`Género creado: ${genre.id}`, { nombre: genre.nombre });
    return toDTO(genre);
};

// Update genre (UPSERT with ID modification support)
exports.updateGenre = async (id, data) => {
    const { name, imageId, active, newId } = data;
    const updateData = {};

    if (name) updateData.nombre = name;
    if (imageId !== undefined) updateData.imageId = imageId;
    if (active !== undefined) updateData.activo = active;

    // Si se quiere cambiar el ID (slug)
    if (newId && newId !== id) {
        // Verificar conflicto
        const existing = await Genre.findOne({ id: newId });
        if (existing) {
            const error = new Error(`El ID '${newId}' ya está en uso por otro género`);
            error.statusCode = 400;
            throw error;
        }
        updateData.id = newId;
    }

    const genre = await Genre.findOneAndUpdate(
        { id },
        {
            $set: updateData,
            $setOnInsert: { id: newId || id }
        },
        {
            new: true,
            upsert: true,
            runValidators: true,
            setDefaultsOnInsert: true
        }
    );

    // Si hubo cambio de ID efectivo, migrar productos
    if (newId && newId !== id && genre) {
        const result = await Product.updateMany({ generoId: id }, { generoId: newId });
        logger.info(`Migrados ${result.modifiedCount} productos de género '${id}' a '${newId}'`);
    }

    return toDTO(genre);
};

// Delete genre (Soft Delete)
exports.deleteGenre = async (id) => {
    let genre = await Genre.findOneAndUpdate({ id }, { activo: false }, { new: true });

    if (!genre && id.match(/^[0-9a-fA-F]{24}$/)) {
        genre = await Genre.findByIdAndUpdate(id, { activo: false }, { new: true });
    }

    if (!genre) {
        const error = new Error('Género no encontrado');
        error.statusCode = 404;
        throw error;
    }

    logger.info(`Género eliminado (soft delete): ${id}`);
    return true;
};

// Delete multiple genres (Soft Delete)
exports.deleteGenres = async (ids) => {
    if (!ids || ids.length === 0) {
        const error = new Error('No se proporcionaron IDs para eliminar');
        error.statusCode = 400;
        throw error;
    }

    const mongoIds = ids.filter(id => id.match(/^[0-9a-fA-F]{24}$/));
    const customIds = ids;

    const result = await Genre.updateMany(
        {
            $or: [
                { id: { $in: customIds } },
                { _id: { $in: mongoIds } }
            ]
        },
        { activo: false }
    );

    logger.info(`Géneros eliminados (soft delete): ${result.modifiedCount}`, { ids });
    return result;
};
