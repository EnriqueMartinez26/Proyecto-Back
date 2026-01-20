const Genre = require('../models/Genre');

// Helper to map to DTO
const toDTO = (g) => ({
    id: g.id,
    name: g.nombre,
    imageId: g.imageId,
    active: g.activo
});

// Get all genres
exports.getGenres = async (req, res, next) => {
    try {
        const genres = await Genre.find();
        res.status(200).json(genres.map(toDTO));
    } catch (error) {
        next(error);
    }
};

// Get genre by ID
exports.getGenre = async (req, res, next) => {
    try {
        const { id } = req.params;
        let genre = await Genre.findOne({ id });

        if (!genre && id.match(/^[0-9a-fA-F]{24}$/)) {
            genre = await Genre.findById(id);
        }

        if (!genre) {
            const error = new Error('Género no encontrado');
            error.statusCode = 404;
            throw error;
        }

        res.status(200).json({ success: true, data: toDTO(genre) });
    } catch (error) {
        next(error);
    }
};

// Update genre (UPSERT - Update or Insert)
exports.updateGenre = async (req, res, next) => {
    try {
        const { name, imageId, active } = req.body;
        const updateData = {};

        if (name) updateData.nombre = name;
        if (imageId !== undefined) updateData.imageId = imageId;
        // Map 'active' from body to 'activo' in DB
        if (active !== undefined) updateData.activo = active;

        const genre = await Genre.findOneAndUpdate(
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
            data: toDTO(genre)
        });
    } catch (error) {
        next(error);
    }
};

// Create genre
exports.createGenre = async (req, res, next) => {
    try {
        const { id, name, imageId, active } = req.body;

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

        res.status(201).json(toDTO(genre));
    } catch (error) {
        next(error);
    }
};

// Delete genre (Soft Delete)
exports.deleteGenre = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Try soft deleting by custom ID first
        let genre = await Genre.findOneAndUpdate({ id }, { activo: false }, { new: true });

        // If not found and it looks like a MongoID, try by _id
        if (!genre && id.match(/^[0-9a-fA-F]{24}$/)) {
            genre = await Genre.findByIdAndUpdate(id, { activo: false }, { new: true });
        }

        if (!genre) {
            const error = new Error('Género no encontrado');
            error.statusCode = 404;
            throw error;
        }

        res.status(200).json({ success: true, message: 'Género eliminado (Soft Delete)', id });
    } catch (error) {
        next(error);
    }
};

// Delete multiple genres (Soft Delete)
exports.deleteGenres = async (req, res, next) => {
    try {
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

        res.status(200).json({
            success: true,
            message: `${result.modifiedCount} géneros eliminados (Soft Delete)`,
            ids
        });
    } catch (error) {
        next(error);
    }
};
