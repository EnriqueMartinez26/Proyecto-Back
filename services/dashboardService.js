const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

class DashboardService {
  static async getStats() {
    const date = new Date();
    const firstDayCurrentMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const firstDayLastMonth = new Date(date.getFullYear(), date.getMonth() - 1, 1);

    const [revenueStats, totalUsers, productStats, monthlyRevenue] = await Promise.all([
      Order.aggregate([
        { $match: { isPaid: true } },
        { $group: { _id: null, totalRevenue: { $sum: '$totalPrice' }, totalOrders: { $sum: 1 } } }
      ]),
      User.countDocuments({ role: 'user' }),
      Product.aggregate([
        {
          $group: {
            _id: null,
            activeProducts: { $sum: { $cond: ['$activo', 1, 0] } },
            lowStock: { $sum: { $cond: [{ $and: ['$activo', { $lte: ['$stock', 5] }] }, 1, 0] } }
          }
        }
      ]),
      Order.aggregate([
        { $match: { isPaid: true, createdAt: { $gte: firstDayLastMonth } } },
        { $group: { _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } }, revenue: { $sum: '$totalPrice' } } },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ])
    ]);

    let currentMonthRev = 0, lastMonthRev = 0;
    monthlyRevenue.forEach(item => {
      if (item._id.month === date.getMonth() + 1) currentMonthRev = item.revenue;
      else lastMonthRev = item.revenue;
    });
    const monthlyGrowth = lastMonthRev === 0 ? 100 : ((currentMonthRev - lastMonthRev) / lastMonthRev) * 100;

    return {
      totalRevenue: revenueStats[0]?.totalRevenue || 0,
      totalOrders: revenueStats[0]?.totalOrders || 0,
      totalUsers,
      activeProducts: productStats[0]?.activeProducts || 0,
      lowStockProducts: productStats[0]?.lowStock || 0,
      monthlyGrowth: Number(monthlyGrowth.toFixed(1))
    };
  }

  static async getSalesChart() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const chartData = await Order.aggregate([
      { $match: { isPaid: true, createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, total: { $sum: '$totalPrice' }, orders: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    return chartData.map(item => ({ date: item._id, total: item.total, orders: item.orders }));
  }

  static async getTopProducts() {
    return Order.aggregate([
      { $match: { isPaid: true } },
      { $unwind: '$orderItems' },
      { $group: { _id: '$orderItems.product', name: { $first: '$orderItems.name' }, totalSold: { $sum: '$orderItems.quantity' }, revenueGenerated: { $sum: { $multiply: ['$orderItems.price', '$orderItems.quantity'] } } } },
      { $sort: { totalSold: -1 } },
      { $limit: 5 }
    ]);
  }

  static async getRecentSales() {
    const orders = await Order.find()
      .select('totalPrice user createdAt isPaid orderStatus')
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    return orders.map(order => ({
      id: order._id,
      user: { name: order.user?.name || 'Usuario Eliminado', email: order.user?.email || 'N/A' },
      amount: order.totalPrice,
      status: order.orderStatus,
      date: order.createdAt
    }));
  }
}

module.exports = DashboardService;
