const DashboardService = require('../services/dashboardService');

exports.getStats = async (req, res, next) => {
  try {
    const data = await DashboardService.getStats();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

exports.getSalesChart = async (req, res, next) => {
  try {
    const data = await DashboardService.getSalesChart();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

exports.getTopProducts = async (req, res, next) => {
  try {
    const data = await DashboardService.getTopProducts();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

exports.getRecentSales = async (req, res, next) => {
  try {
    const data = await DashboardService.getRecentSales();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
