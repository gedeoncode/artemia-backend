const mongoose = require("mongoose");
const Seller = require("../../../models/Seller.model")
const Order = require("../../../models/Order.model")
const Notification = require("../../../models/Notification.model")
const Lead = require("../../../models/Lead.model")
const DashboardOptimizer = require("../../../services/seller/analytics/dashboardOptimizer.service");
const DashboardCache = require("../../../services/seller/analytics/dashboardCache.service");
const InventoryAnalyticsService = require("../../../services/seller/analytics/inventoryAnalytics.service");
const OrderAnalyticsService = require("../../../services/seller/analytics/orderAnalytics.service");
const LeadAnalyticsService = require("../../../services/seller/analytics/leadAnalytics.service");
const ReviewAnalyticsService = require("../../../services/seller/analytics/reviewAnalytics.service");
const {
  getRecentNotificationsOptimized,
  calculatePerformanceMetricsOptimized,
  buildTimeSeriesData,
  buildChartDataOptimized,
  generateInsightsOptimized,
} = require("./dashboard.helpers");

// =========================
// MAIN CONTROLLER - OPTIMIZED
// =========================
const getSellerDashboard = async (req, res) => {
  const startTime = Date.now();

  try {
    const sellerId = req.seller._id;

    if (!mongoose.Types.ObjectId.isValid(sellerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid seller ID",
      });
    }

    const {
      month,
      year,
      interval = "daily",
      compareWithPrevious = "false",
    } = req.query;

    // Validate and get date range with bounds checking
    let start, end;
    try {
      const dateRange = DashboardOptimizer.getOptimizedDateRange(
        month,
        year,
        90,
      );
      start = dateRange.start;
      end = dateRange.end;
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    // Check cache first
    const cacheKey = DashboardCache.getCacheKey(sellerId.toString(), {
      month,
      year,
      interval,
      compareWithPrevious,
    });
    const cachedData = await DashboardCache.get(cacheKey);

    if (cachedData) {
      return res.json({
        ...cachedData,
        metadata: {
          ...cachedData.metadata,
          cached: true,
          serverTime: Date.now() - startTime,
        },
      });
    }

    // Create date filter once
    const dateFilter = {
      createdAt: { $gte: start, $lte: end },
    };

    const sellerObjectId = new mongoose.Types.ObjectId(sellerId);

    // =========================
    // OPTIMIZED: Sequential execution with controlled concurrency
    // Instead of Promise.all with 12+ operations, we batch them
    // to reduce peak memory usage
    // =========================

    // BATCH 1: Basic info and seller data (lightweight)
    const [seller, inventoryMetrics] = await Promise.all([
      Seller.findById(sellerId)
        .populate("user", "name email phone avatar") // Only select needed fields
        .lean() // Use lean() for performance
        .exec(),
      InventoryAnalyticsService.getInventoryMetrics(sellerId),
    ]);

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "Seller not found",
      });
    }

    // BATCH 2: Order analytics (heavier, but single aggregation)
    const orderStats = await OrderAnalyticsService.getOrderStats(
      sellerId,
      dateFilter,
    );

    // BATCH 3: Lead and customer analytics (can run in parallel)
    const [leadStats, customerMetrics] = await Promise.all([
      LeadAnalyticsService.getLeadStats(sellerId, dateFilter),
      OrderAnalyticsService.getCustomerMetrics(sellerId, dateFilter),
    ]);

    // BATCH 4: Product performance (heavier aggregations)
    const [categoryPerformance, topProducts] = await Promise.all([
      OrderAnalyticsService.getCategoryPerformance(sellerId, dateFilter),
      OrderAnalyticsService.getTopProducts(sellerId, dateFilter, 10),
    ]);

    // BATCH 5: Reviews and previous period (conditional)
    const [reviewStats, previousPeriodStats] = await Promise.all([
      ReviewAnalyticsService.getReviewStats(sellerId, dateFilter),
      compareWithPrevious === "true"
        ? getPreviousPeriodStatsOptimized(sellerId, start, end)
        : Promise.resolve(null),
    ]);

    // BATCH 6: Recent activities (limited data with lean())
    const [recentOrders, recentLeads, recentNotifications, unreadCount] =
      await Promise.all([
        Order.find({ seller: sellerId, ...dateFilter })
          .select("user totalAmount status createdAt") // Select only needed fields
          .populate("user", "name phone email") // Only needed fields
          .sort({ createdAt: -1 })
          .lean() // Critical for memory
          .limit(10)
          .exec(),
        Lead.find({ seller: sellerId, ...dateFilter })
          .select("product customer status createdAt contactMethod") // Select only needed
          .populate("product", "name price images")
          .populate("customer", "name phone email")
          .sort({ createdAt: -1 })
          .lean()
          .limit(10)
          .exec(),
        getRecentNotificationsOptimized(sellerObjectId),
        Notification.countDocuments({
          recipients: {
            $elemMatch: {
              userId: sellerObjectId,
              userType: "Seller",
              read: false,
            },
          },
        }).lean(),
      ]);

    // Calculate performance metrics
    const performanceMetrics = calculatePerformanceMetricsOptimized({
      totalOrders: orderStats.totalOrders,
      completedOrders: orderStats.completedOrders,
      cancelledOrders: orderStats.cancelledOrders,
      totalRevenue: orderStats.totalRevenue,
      avgOrderValue: orderStats.avgOrderValue,
      totalProducts: inventoryMetrics.totalProducts,
      leadStats,
      previousPeriodStats,
      customerMetrics,
    });

    // Build time series data for charts (using orderStats data)
    const timeSeriesData = buildTimeSeriesData(
      orderStats.timeSeriesData,
      start,
      end,
      interval,
    );

    // Build chart data with memory efficiency (avoid creating large temporary arrays)
    const chartData = buildChartDataOptimized(
      timeSeriesData,
      previousPeriodStats,
      categoryPerformance,
      topProducts,
      leadStats,
      performanceMetrics,
    );

    // Generate insights
    const insights = generateInsightsOptimized({
      performanceMetrics,
      lowStockProducts: inventoryMetrics.lowStockProducts,
      leadStats,
      reviewStats,
      topProducts,
    });

    // Prepare response (already using lean data)
    const responseData = {
      success: true,
      seller: {
        id: seller._id,
        businessName: seller.businessName,
        user: seller.user,
        metrics: seller.metrics,
      },
      stats: {
        totalProducts: inventoryMetrics.totalProducts,
        totalOrders: orderStats.totalOrders,
        pendingOrders: orderStats.pendingOrders,
        completedOrders: orderStats.completedOrders,
        cancelledOrders: orderStats.cancelledOrders,
        totalRevenue: orderStats.totalRevenue,
        avgOrderValue: orderStats.avgOrderValue,
        conversionRate: performanceMetrics.conversionRate,
        ...leadStats,
        unreadCount,
      },
      performance: performanceMetrics,
      charts: chartData,
      recentActivities: {
        orders: recentOrders,
        leads: recentLeads,
        notifications: recentNotifications,
      },
      alerts: {
        lowStock: inventoryMetrics.lowStockProducts,
        inventory: inventoryMetrics.inventoryAlerts,
        pendingOrders:
          orderStats.pendingOrders > 10
            ? {
                count: orderStats.pendingOrders,
                message: `${orderStats.pendingOrders} orders need attention`,
              }
            : null,
      },
      insights,
      metadata: {
        period: {
          start,
          end,
          interval,
          compareWithPrevious: compareWithPrevious === "true",
        },
        lastUpdated: new Date(),
        cacheTTL: 300,
        queryTimeMs: Date.now() - startTime,
      },
    };

    // Cache the response
    await DashboardCache.set(cacheKey, responseData, 300);

    res.json(responseData);
  } catch (err) {
    console.error("Dashboard Error:", err);

    // Don't leak internal errors in production
    const errorResponse = {
      success: false,
      message: "Failed to load dashboard",
      ...(process.env.NODE_ENV === "development" && {
        error: err.message,
        stack: err.stack,
      }),
    };

    // Determine appropriate status code
    const statusCode =
      err.name === "ValidationError"
        ? 400
        : err.name === "MongoTimeoutError"
          ? 504
          : 500;

    res.status(statusCode).json(errorResponse);
  }
};


// =========================
// SELLER SHELL CONTROLLER
// =========================
const getSellerShell = async (req, res) => {
  try {
    const sellerId = req.seller?._id;

    if (!mongoose.Types.ObjectId.isValid(sellerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid seller ID",
      });
    }

    const sellerObjectId = new mongoose.Types.ObjectId(sellerId);

    // Count unread notifications only
    const unreadNotifications = await Notification.countDocuments({
      recipients: {
        $elemMatch: {
          userId: sellerObjectId,
          userType: "Seller",
          read: false,
        },
      },
    });

    return res.json({
      success: true,
      data: {
        unreadNotifications,
      },
      metadata: {
        lastUpdated: new Date(),
      },
    });
  } catch (err) {
    console.error("Seller Shell Error:", err);

    const errorResponse = {
      success: false,
      message: "Failed to load seller shell",
      ...(process.env.NODE_ENV === "development" && {
        error: err.message,
        stack: err.stack,
      }),
    };

    const statusCode =
      err.name === "ValidationError"
        ? 400
        : err.name === "MongoTimeoutError"
          ? 504
          : 500;

    return res.status(statusCode).json(errorResponse);
  }
};



module.exports = {
  getSellerDashboard,
  getSellerShell
};
