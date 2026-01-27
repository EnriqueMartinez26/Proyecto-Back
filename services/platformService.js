const Platform = require('../models/Platform');
const logger = require('../utils/logger');

// Helper to map to DTO
const toDTO = (p) => ({
    id: p.id,
    name: p.nombre,
    imageId: p.imageId,
    active: p.activo
});

// Get all platforms
exports.getPlatforms = async () => {
    const platforms = await Platform.find();
    logger.info(`Plataformas obtenidas: ${platforms.length}`);
    return platforms.map(toDTO);
};

// Get platform by ID
exports.getPlatformById = async (id) => {
    let platform = await Platform.findOne({ id });

    if (!platform && id.match(/^[0-9a-fA-F]{24}$/)) {
        platform = await Platform.findById(id);
    }

    if (!platform) {
        const error = new Error('Plataforma no encontrada');
        error.statusCode = 404;
        throw error;
    }

    return toDTO(platform);
};

// Create platform
exports.createPlatform = async (data) => {
    const { id, name, imageId, active } = data;

    if (!id) {
        const error = new Error('El ID personalizado es requerido');
        error.statusCode = 400;
        throw error;
    }

    const existing = await Platform.findOne({ id });
    if (existing) {
        const error = new Error('Ya existe una plataforma con ese ID');
        error.statusCode = 400;
        throw error;
    }

    const platform = await Platform.create({
        id,
        nombre: name,
        imageId,
        activo: active !== undefined ? active : true
    });

    logger.info(`Plataforma creada: ${platform.id}`, { nombre: platform.nombre });
    return toDTO(platform);
};

// Update platform (UPSERT)
exports.updatePlatform = async (id, data) => {
    const { name, imageId, active } = data;
    const updateData = {};

    if (name) updateData.nombre = name;
    if (imageId !== undefined) updateData.imageId = imageId;
    if (active !== undefined) updateData.activo = active;

    const platform = await Platform.findOneAndUpdate(
        { id },
        {
            $set: updateData,
            $setOnInsert: { id }
        },
        {
            new: true,
            upsert: true,
            runValidators: true,
            setDefaultsOnInsert: true
        }
    );

    logger.info(`Plataforma actualizada: ${platform.id}`);
    return toDTO(platform);
};

// Delete platform (Soft Delete)
exports.deletePlatform = async (id) => {
    let platform = await Platform.findOneAndUpdate({ id }, { activo: false }, { new: true });

    if (!platform && id.match(/^[0-9a-fA-F]{24}$/)) {
        platform = await Platform.findByIdAndUpdate(id, { activo: false }, { new: true });
    }

    if (!platform) {
        const error = new Error('Plataforma no encontrada');
        error.statusCode = 404;
        throw error;
    }

    logger.info(`Plataforma eliminada (soft delete): ${id}`);
    return true;
};

// Delete multiple platforms (Soft Delete)
exports.deletePlatforms = async (ids) => {
    if (!ids || ids.length === 0) {
        const error = new Error('No se proporcionaron IDs para eliminar');
        error.statusCode = 400;
        throw error;
    }

    const mongoIds = ids.filter(id => id.match(/^[0-9a-fA-F]{24}$/));
    const customIds = ids;

    const result = await Platform.updateMany(
        {
            $or: [
                { id: { $in: customIds } },
                { _id: { $in: mongoIds } }
            ]
        },
        { activo: false }
    );

    logger.info(`Plataformas eliminadas (soft delete): ${result.modifiedCount}`, { ids });
    return result;
};
