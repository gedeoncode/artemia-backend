// controllers/adminDashboard.controller.js

const User = require("../../models/User.model");
const Seller = require("../../models/Seller.model");
const Order = require("../../models/Order.model");
const Product = require("../../models/Product.model");
const Category = require("../../models/category.model");
const Notification = require("../../models/Notification.model");
const moment = require("moment");

exports.getAdminDashboard = async (req, res) => {
  try {
    // Basic counts
    const [
      totalUsers,
      totalSellers,
      totalOrders,
      totalProducts,
      totalCategories,
      unreadNotifications,
    ] = await Promise.all([
      User.countDocuments(),
      Seller.countDocuments(),
      Order.countDocuments(),
      Product.countDocuments(),
      Category.countDocuments(),
      Notification.countDocuments({
        recipient: req.user._id,
        read: false,
      }),
    ]);

    // Order data with proper date filtering for last 12 months
    const startDate = moment().subtract(12, "months").startOf("month").toDate();
    const orders = await Order.find({
      createdAt: { $gte: startDate },
    });
    const platformOrders = orders.filter((o) => o.handledBy === "platform");
    const sellerOrders = orders.filter((o) => o.handledBy === "seller");
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("client", "name");

    // Revenue calculations (FIXED)
    const platformRevenue = calculateTotalRevenue(platformOrders);
    const sellerRevenue = calculateTotalRevenue(sellerOrders);
    const totalRevenue = platformRevenue + sellerRevenue;

    // Monthly breakdown for chart (formatted for frontend)
    const monthlyRevenueData = calculateMonthlyRevenueData(
      platformOrders,
      sellerOrders,
    );
    const monthlyGrowth = calculateGrowthRate(monthlyRevenueData);

    // Product statistics
    const [topProducts, lowStockProducts] = await Promise.all([
      Product.find()
        .sort({ salesCount: -1 })
        .limit(5)
        .select("name salesCount images price stock"),
      Product.find({ stock: { $lt: 10 } }).countDocuments(),
    ]);

    // User engagement
    const [newUsers, activeUsers] = await Promise.all([
      User.countDocuments({
        createdAt: {
          $gte: moment().subtract(7, "days").toDate(),
        },
      }),
      User.countDocuments({
        lastLogin: {
          $gte: moment().subtract(30, "days").toDate(),
        },
      }),
    ]);

    // Seller performance
    const [topSellers, pendingSellerApplications] = await Promise.all([
      Seller.find({ status: "approved" })
        .sort({ totalSales: -1 })
        .limit(3)
        .select("businessName totalSales rating logo"),
      Seller.countDocuments({ status: "pending" }),
    ]);

    // Recent notifications
    const recentNotifications = await Notification.find({
      recipient: req.user._id,
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("sender", "name")
      .lean();

    res.json({
      success: true,
      // Basic metrics
      totals: {
        users: totalUsers,
        sellers: totalSellers,
        orders: totalOrders,
        products: totalProducts,
        categories: totalCategories,
        unreadNotifications,
      },

      // Financial data (formatted for frontend chart)
      revenue: {
        platform: platformRevenue,
        seller: sellerRevenue,
        total: totalRevenue,
        // This matches the expected format for RevenueAnalyticsChart
        monthlyData: monthlyRevenueData,
        monthlyGrowth,
      },

      // Product data
      products: {
        topSelling: topProducts.map((product) => ({
          id: product._id,
          name: product.name,
          salesCount: product.salesCount,
          price: product.price,
          stock: product.stock,
          image: product.images?.[0] || null,
        })),
        lowStockCount: lowStockProducts,
      },

      // User data
      users: {
        newLast7Days: newUsers,
        activeLast30Days: activeUsers,
        total: totalUsers,
      },

      // Seller data
      sellers: {
        topPerformers: topSellers.map((seller) => ({
          id: seller._id,
          businessName: seller.businessName,
          totalSales: seller.totalSales,
          rating: seller.rating,
          logo: seller.logo,
        })),
        pendingApplications: pendingSellerApplications,
        total: totalSellers,
      },

      // Recent activity
      recentOrders: recentOrders.map((order) => ({
        id: order._id,
        user: order.client?.name || "Guest",
        amount: order.totalPrice,
        status: order.status,
        date: order.createdAt,
        items: order.products?.length || 0,
      })),

      // Notifications
      notifications: {
        recent: recentNotifications.map((notif) => ({
          id: notif._id,
          title: notif.title,
          message: notif.message,
          type: notif.type,
          read: notif.read,
          sender: notif.sender?.name || "System",
          date: notif.createdAt,
        })),
        unreadCount: unreadNotifications,
      },

      // System health
      systemHealth: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
        environment: process.env.NODE_ENV,
      },
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to load dashboard statistics",
      message: error.message,
    });
  }
};

/**
 * Calculate total revenue from orders (FIXED - removes nested loop bug)
 */
function calculateTotalRevenue(orders) {
  return orders.reduce((sum, order) => {
    // Calculate order total from individual products
    return sum + (order.totalPrice || 0);
  }, 0);
}

/**
 * Calculate monthly revenue data formatted for the frontend chart
 * Returns array of objects with month, sellerRevenue, platformRevenue, totalRevenue
 */
function calculateMonthlyRevenueData(platformOrders, sellerOrders) {
  // Initialize last 12 months
  const monthlyData = [];
  const now = moment();

  // Create map for quick lookups
  const platformMap = new Map();
  const sellerMap = new Map();

  // Group platform orders by month
  platformOrders.forEach((order) => {
    const monthKey = moment(order.createdAt).format("MMM YYYY");
    const monthShort = moment(order.createdAt).format("MMM");

    const orderTotal = calculateOrderTotal(order);

    if (!platformMap.has(monthKey)) {
      platformMap.set(monthKey, {
        month: monthShort,
        revenue: 0,
        fullKey: monthKey,
      });
    }
    platformMap.get(monthKey).revenue += orderTotal;
  });

  // Group seller orders by month
  sellerOrders.forEach((order) => {
    const monthKey = moment(order.createdAt).format("MMM YYYY");
    const monthShort = moment(order.createdAt).format("MMM");

    const orderTotal = calculateOrderTotal(order);

    if (!sellerMap.has(monthKey)) {
      sellerMap.set(monthKey, {
        month: monthShort,
        revenue: 0,
        fullKey: monthKey,
      });
    }
    sellerMap.get(monthKey).revenue += orderTotal;
  });

  // Generate last 12 months in order
  for (let i = 11; i >= 0; i--) {
    const date = moment().subtract(i, "months");
    const monthKey = date.format("MMM YYYY");
    const monthShort = date.format("MMM");

    const platformRevenue = platformMap.get(monthKey)?.revenue || 0;
    const sellerRevenue = sellerMap.get(monthKey)?.revenue || 0;

    monthlyData.push({
      month: monthShort,
      sellerRevenue: Math.round(sellerRevenue),
      platformRevenue: Math.round(platformRevenue),
      totalRevenue: Math.round(platformRevenue + sellerRevenue),
      fullDate: date.toISOString(), // Optional: for sorting reference
    });
  }

  return monthlyData;
}

/**
 * Calculate order total from products array
 */
function calculateOrderTotal(order) {
  return order.totalPrice || 0;
}

/**
 * Calculate growth rate from monthly data
 */
function calculateGrowthRate(monthlyData) {
  if (!monthlyData || monthlyData.length < 2) return 0;

  const currentMonth = monthlyData[monthlyData.length - 1];
  const previousMonth = monthlyData[monthlyData.length - 2];

  if (!currentMonth || !previousMonth) return 0;

  const currentRevenue = currentMonth.totalRevenue;
  const previousRevenue = previousMonth.totalRevenue;

  if (previousRevenue === 0) return 0;

  return ((currentRevenue - previousRevenue) / previousRevenue) * 100;
}

/**
 * Optional: Get detailed breakdown by category or product
 * Useful for more advanced analytics
 */
exports.getRevenueBreakdown = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = "category" } = req.query;

    const query = {};
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const orders = await Order.find(query).populate(
      "products.product",
      "price name category",
    );

    const breakdown = {};

    orders.forEach((order) => {
      order.products.forEach((item) => {
        const product = item.product;
        if (!product) return;

        let key;
        if (groupBy === "category") {
          key = product.category?.toString() || "Uncategorized";
        } else if (groupBy === "product") {
          key = product._id.toString();
        } else {
          key = "all";
        }

        const revenue = (product.price || 0) * (item.quantity || 0);

        if (!breakdown[key]) {
          breakdown[key] = {
            name:
              groupBy === "category"
                ? product.category?.name || "Uncategorized"
                : product.name,
            revenue: 0,
            orderCount: 0,
          };
        }

        breakdown[key].revenue += revenue;
        breakdown[key].orderCount += 1;
      });
    });

    res.json({
      success: true,
      breakdown: Object.values(breakdown).sort((a, b) => b.revenue - a.revenue),
      groupBy,
      dateRange: { startDate, endDate },
    });
  } catch (error) {
    console.error("Revenue breakdown error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
