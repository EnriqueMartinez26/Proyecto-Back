const PlatformService = require('../services/platformService');

// Get all platforms
exports.getPlatforms = async (req, res, next) => {
    try {
        const platforms = await PlatformService.getPlatforms();
        res.status(200).json(platforms);
    } catch (error) {
        next(error);
    }
};

// Get platform by ID
exports.getPlatform = async (req, res, next) => {
    try {
        const platform = await PlatformService.getPlatformById(req.params.id);
        res.status(200).json({ success: true, data: platform });
    } catch (error) {
        next(error);
    }
};

// Create platform
exports.createPlatform = async (req, res, next) => {
    try {
        const platform = await PlatformService.createPlatform(req.body);
        res.status(201).json(platform);
    } catch (error) {
        next(error);
    }
};

// Update platform (UPSERT - Update or Insert)
exports.updatePlatform = async (req, res, next) => {
    try {
        const platform = await PlatformService.updatePlatform(req.params.id, req.body);
        res.status(200).json({
            success: true,
            data: platform
        });
    } catch (error) {
        next(error);
    }
};

// Delete platform (Soft Delete)
exports.deletePlatform = async (req, res, next) => {
    try {
        await PlatformService.deletePlatform(req.params.id);
        res.status(200).json({ success: true, message: 'Plataforma eliminada (Soft Delete)', id: req.params.id });
    } catch (error) {
        next(error);
    }
};

// Delete multiple platforms (Soft Delete)
exports.deletePlatforms = async (req, res, next) => {
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

        const result = await PlatformService.deletePlatforms(ids);

        res.status(200).json({
            success: true,
            message: `${result.modifiedCount} plataformas eliminadas (Soft Delete)`,
            ids
        });
    } catch (error) {
        next(error);
    }
};
