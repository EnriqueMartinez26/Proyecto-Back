const GenreService = require('../services/genreService');
const parseBulkIds = require('../utils/parseBulkIds');

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
        const ids = parseBulkIds(req);
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
