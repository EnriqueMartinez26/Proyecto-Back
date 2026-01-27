const GenreService = require('../services/genreService');

// Get all genres
exports.getGenres = async (req, res, next) => {
    try {
        const genres = await GenreService.getGenres();
        res.status(200).json(genres);
    } catch (error) {
        next(error);
    }
};

// Get genre by ID
exports.getGenre = async (req, res, next) => {
    try {
        const genre = await GenreService.getGenreById(req.params.id);
        res.status(200).json({ success: true, data: genre });
    } catch (error) {
        next(error);
    }
};

// Create genre
exports.createGenre = async (req, res, next) => {
    try {
        const genre = await GenreService.createGenre(req.body);
        res.status(201).json(genre);
    } catch (error) {
        next(error);
    }
};

// Update genre (UPSERT - Update or Insert)
exports.updateGenre = async (req, res, next) => {
    try {
        const genre = await GenreService.updateGenre(req.params.id, req.body);
        res.status(200).json({
            success: true,
            data: genre
        });
    } catch (error) {
        next(error);
    }
};

// Delete genre (Soft Delete)
exports.deleteGenre = async (req, res, next) => {
    try {
        await GenreService.deleteGenre(req.params.id);
        res.status(200).json({ success: true, message: 'Género eliminado (Soft Delete)', id: req.params.id });
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

        const result = await GenreService.deleteGenres(ids);

        res.status(200).json({
            success: true,
            message: `${result.modifiedCount} géneros eliminados (Soft Delete)`,
            ids
        });
    } catch (error) {
        next(error);
    }
};
