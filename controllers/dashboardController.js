const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const logger = require('../utils/logger');

// @desc    Obtener estadísticas generales (KPIs)
// @route   GET /api/dashboard/stats
// @access  Private/Admin
exports.getStats = async (req, res, next) => {
    try {
        // 1. Total Revenue & Orders (Solo pagadas/completadas)
        const revenueStats = await Order.aggregate([
            { $match: { isPaid: true } }, // Asegurar que solo contamos lo cobrado
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$totalPrice" },
                    totalOrders: { $sum: 1 }
                }
            }
        ]);

        // 2. Total Users
        const totalUsers = await User.countDocuments({ role: 'user' });

        // 3. Active Products & Low Stock
        const productStats = await Product.aggregate([
            {
                $group: {
                    _id: null,
                    activeProducts: { $sum: { $cond: ["$activo", 1, 0] } },
                    lowStock: {
                        $sum: {
                            $cond: [{ $and: ["$activo", { $lte: ["$stock", 5] }] }, 1, 0]
                        }
                    }
                }
            }
        ]);

        // 4. Monthly Growth (Comparativa mes actual vs anterior)
        const date = new Date();
        const firstDayCurrentMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        const firstDayLastMonth = new Date(date.getFullYear(), date.getMonth() - 1, 1);

        const monthlyRevenue = await Order.aggregate([
            {
                $match: {
                    isPaid: true,
                    createdAt: { $gte: firstDayLastMonth }
                }
            },
            {
                $group: {
                    _id: {
                        month: { $month: "$createdAt" },
                        year: { $year: "$createdAt" }
                    },
                    revenue: { $sum: "$totalPrice" }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);

        // Calcular crecimiento
        let currentMonthRev = 0;
        let lastMonthRev = 0;

        monthlyRevenue.forEach(item => {
            if (item._id.month === date.getMonth() + 1) currentMonthRev = item.revenue;
            else lastMonthRev = item.revenue;
        });

        const growthParams = lastMonthRev === 0 ? 100 : ((currentMonthRev - lastMonthRev) / lastMonthRev) * 100;

        res.status(200).json({
            success: true,
            data: {
                totalRevenue: revenueStats[0]?.totalRevenue || 0,
                totalOrders: revenueStats[0]?.totalOrders || 0,
                totalUsers,
                activeProducts: productStats[0]?.activeProducts || 0,
                lowStockProducts: productStats[0]?.lowStock || 0,
                monthlyGrowth: Number(growthParams.toFixed(1))
            }
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Obtener datos para gráfico de ventas (últimos 30 días)
// @route   GET /api/dashboard/chart
// @access  Private/Admin
exports.getSalesChart = async (req, res, next) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const chartData = await Order.aggregate([
            {
                $match: {
                    isPaid: true,
                    createdAt: { $gte: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
                    },
                    total: { $sum: "$totalPrice" },
                    orders: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.status(200).json({
            success: true,
            data: chartData.map(item => ({
                date: item._id, // "2024-02-17"
                total: item.total,
                orders: item.orders
            }))
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Obtener productos Top Ventas (Ranking)
// @route   GET /api/dashboard/top-products
// @access  Private/Admin
exports.getTopProducts = async (req, res, next) => {
    try {
        // Usamos el campo 'cantidadVendida' que definimos en el Modelo pero que hay que mantener actualizado
        // Si no confiamos en 'cantidadVendida', calculamos real-time desde Orders (más costoso pero exacto)

        // Opción Real-Time (Heavy Calculation):
        const topSelling = await Order.aggregate([
            { $match: { isPaid: true } },
            { $unwind: "$orderItems" },
            {
                $group: {
                    _id: "$orderItems.product", // ID del producto
                    name: { $first: "$orderItems.name" },
                    totalSold: { $sum: "$orderItems.quantity" },
                    revenueGenerated: { $sum: { $multiply: ["$orderItems.price", "$orderItems.quantity"] } }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 5 }
        ]);

        res.status(200).json({
            success: true,
            data: topSelling
        });
    } catch (error) {
        next(error);
    }
};
