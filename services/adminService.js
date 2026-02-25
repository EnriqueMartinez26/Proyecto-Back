const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const logger = require('../utils/logger');

exports.getDashboardStats = async () => {
    // 1. KPIs
    const totalUsers = await User.countDocuments();
    const activeProducts = await Product.countDocuments({ activo: true });

    // Low Stock (e.g. less than 10)
    const lowStockCount = await Product.countDocuments({ activo: true, stock: { $lt: 10 } });

    // Total Revenue (Only Paid Orders)
    const revenueResult = await Order.aggregate([
        { $match: { isPaid: true } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

    // 2. Revenue Chart (Last 6 Months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const revenueChart = await Order.aggregate([
        {
            $match: {
                isPaid: true,
                paidAt: { $gte: sixMonthsAgo }
            }
        },
        {
            $group: {
                _id: { $month: '$paidAt' },
                total: { $sum: '$totalPrice' }
            }
        },
        { $sort: { _id: 1 } } // Sort by month index
    ]);

    // Map month numbers to names (optional, or send numeric)
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const formattedChart = revenueChart.map(item => ({
        name: monthNames[item._id - 1], // mongo returns 1-12
        total: item.total
    }));

    // 3. Recent Sales (Last 5)
    // We need User Name, Email, and Amount.
    const recentOrders = await Order.find()
        .select('totalPrice user createdAt isPaid orderStatus')
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

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
