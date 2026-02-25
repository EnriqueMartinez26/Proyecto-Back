const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const logger = require('../utils/logger');

exports.getDashboardStats = async () => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Parallelize all independent queries
    const [
        totalUsers,
        activeProducts,
        lowStockCount,
        revenueResult,
        revenueChart,
        recentOrders
    ] = await Promise.all([
        User.countDocuments(),
        Product.countDocuments({ activo: true }),
        Product.countDocuments({ activo: true, stock: { $lt: 10 } }),
        Order.aggregate([
            { $match: { isPaid: true } },
            { $group: { _id: null, total: { $sum: '$totalPrice' } } }
        ]),
        Order.aggregate([
            { $match: { isPaid: true, paidAt: { $gte: sixMonthsAgo } } },
            {
                $group: {
                    _id: { year: { $year: '$paidAt' }, month: { $month: '$paidAt' } },
                    total: { $sum: '$totalPrice' }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]),
        Order.find()
            .select('totalPrice user createdAt isPaid orderStatus')
            .populate('user', 'name email')
            .sort({ createdAt: -1 })
            .limit(5)
            .lean()
    ]);

    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const formattedChart = revenueChart.map(item => ({
        name: monthNames[item._id.month - 1],
        total: item.total
    }));

    const formattedRecentSales = recentOrders.map(order => ({
        id: order._id,
        user: {
            name: order.user ? order.user.name : 'Usuario Eliminado',
            email: order.user ? order.user.email : 'N/A'
        },
        amount: order.totalPrice,
        status: order.orderStatus,
        date: order.createdAt
    }));

    logger.info('Dashboard stats generados');

    return {
        stats: {
            totalRevenue,
            activeProducts,
            totalUsers,
            lowStockCount
        },
        revenueChart: formattedChart,
        recentSales: formattedRecentSales
    };
};
