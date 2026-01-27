const AdminService = require('../services/adminService');

exports.getDashboardStats = async (req, res, next) => {
    try {
        const stats = await AdminService.getDashboardStats();
        res.json({
            success: true,
            ...stats
        });
    } catch (error) {
        next(error);
    }
};
