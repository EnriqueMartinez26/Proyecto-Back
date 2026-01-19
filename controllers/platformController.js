const Platform = require('../models/Platform');

// Helper to map to DTO
const toDTO = (p) => ({
    id: p.id,
    name: p.nombre,
    imageId: p.imageId,
    active: p.activo
});

// Get all platforms
exports.getPlatforms = async (req, res, next) => {
    try {
        const platforms = await Platform.find();
        res.status(200).json(platforms.map(toDTO));
    } catch (error) {
        next(error);
    }
};

// Get platform by ID
exports.getPlatform = async (req, res, next) => {
    try {
        const { id } = req.params;
        let platform = await Platform.findOne({ id });

        if (!platform && id.match(/^[0-9a-fA-F]{24}$/)) {
            platform = await Platform.findById(id);
        }

        if (!platform) {
            const error = new Error('Plataforma no encontrada');
            error.statusCode = 404;
            throw error;
        }

        res.status(200).json({ success: true, data: toDTO(platform) });
    } catch (error) {
        next(error);
    }
};

// Update platform (UPSERT - Update or Insert)
exports.updatePlatform = async (req, res, next) => {
    try {
        const { name, imageId, active } = req.body;
        const updateData = {};

        if (name) updateData.nombre = name;
        if (imageId !== undefined) updateData.imageId = imageId;
        // Map 'active' from body to 'activo' in DB
        if (active !== undefined) updateData.activo = active;

        const platform = await Platform.findOneAndUpdate(
            { id: req.params.id },
            {
                $set: updateData,
                $setOnInsert: { id: req.params.id }
            },
            {
                new: true,
                upsert: true, // Create if not exists
                runValidators: true,
                setDefaultsOnInsert: true
            }
        );

        res.status(200).json({
            success: true,
            data: toDTO(platform)
        });
    } catch (error) {
        next(error);
    }
};

// Create platform
exports.createPlatform = async (req, res, next) => {
    try {
        const { id, name, imageId, active } = req.body;

        // Custom ID validation
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

        res.status(201).json(toDTO(platform));
    } catch (error) {
        next(error);
    }
};

// Delete platform
exports.deletePlatform = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Try deleting by custom ID first
        let platform = await Platform.findOneAndDelete({ id });

        // If not found and it looks like a MongoID, try deleting by _id
        if (!platform && id.match(/^[0-9a-fA-F]{24}$/)) {
            platform = await Platform.findByIdAndDelete(id);
        }

        if (!platform) {
            const error = new Error('Plataforma no encontrada');
            error.statusCode = 404;
            throw error;
        }

        res.status(200).json({ success: true, message: 'Plataforma eliminada', id });
    } catch (error) {
        next(error);
    }
};

// Delete multiple platforms
exports.deletePlatforms = async (req, res, next) => {
    try {
        console.log('🔍 DELETE /MULTI Request Body:', req.body);
        console.log('🔍 DELETE /MULTI Query:', req.query);

        let ids = [];

        // 1. Try body as array
        if (Array.isArray(req.body) && req.body.length > 0) {
            ids = req.body;
        }
        // 2. Try body with 'ids' property
        else if (req.body.ids && Array.isArray(req.body.ids)) {
            ids = req.body.ids;
        }
        // 3. Try query param 'ids' (comma separated)
        else if (req.query.ids) {
            ids = Array.isArray(req.query.ids)
                ? req.query.ids
                : req.query.ids.split(',').filter(Boolean);
        }

        if (!ids || ids.length === 0) {
            console.warn('❌ No se encontraron IDs en Body ni Query');
            if (Object.keys(req.body).length === 0) {
                const error = new Error('Body vacío. Si usas axios delete, envía: { data: ids } o ?ids=...');
                error.statusCode = 400;
                throw error;
            }

            const error = new Error('Formato de datos inválido. Se esperaba un array de IDs.');
            error.statusCode = 400;
            throw error;
        }

        // Delete using either custom 'id' or Mongo '_id'
        const mongoIds = ids.filter(id => id.match(/^[0-9a-fA-F]{24}$/));
        const customIds = ids;

        const result = await Platform.deleteMany({
            $or: [
                { id: { $in: customIds } },
                { _id: { $in: mongoIds } }
            ]
        });

        res.status(200).json({
            success: true,
            message: `${result.deletedCount} plataformas eliminadas`,
            ids
        });
    } catch (error) {
        next(error);
    }
};
