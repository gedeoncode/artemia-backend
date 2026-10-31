const Order = require("../../../models/Order.model");
const Product = require("../../../models/Product.model");
const { toObjectId } = require("../../../utils/toObjectId");

// salles report

exports.getProductSales = async (req, res, next) => {
  try {
    const { productId } = req.params;

    // Validate product ID
    if (!validateObjectId(productId)) {
      return next(new APIError("Invalid product ID !", 400));
    }

    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      return next(new APIError("Product not found", 404));
    }

    // Check admin permissions (if your app requires it)
    // if (!req.user || !req.user.roles.includes("admin")) {
    //   return next(new APIError("Unauthorized - Admin access required", 403));
    // }

    // Calculate total sales with revenue split
    const salesResults = await Order.aggregate([
      { $unwind: "$products" },
      { $match: { "products.product": toObjectId(productId) } },
      {
        $group: {
          _id: "$handledBy",
          totalQuantity: { $sum: "$products.quantity" },
          totalOrders: { $sum: 1 },
          totalRevenue: {
            $sum: {
              $multiply: ["$products.quantity", "$products.price"],
            },
          },
          platformRevenue: {
            $sum: {
              $multiply: [
                "$products.quantity",
                "$products.price",
                { $cond: [{ $eq: ["$handledBy", "platform"] }, 0.15, 0] },
              ],
            },
          },
          sellerRevenue: {
            $sum: {
              $multiply: [
                "$products.quantity",
                "$products.price",
                { $cond: [{ $eq: ["$handledBy", "platform"] }, 0.85, 1] },
              ],
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          byHandler: { $push: "$$ROOT" },
          totalQuantity: { $sum: "$totalQuantity" },
          totalOrders: { $sum: "$totalOrders" },
          totalRevenue: { $sum: "$totalRevenue" },
          totalPlatformRevenue: { $sum: "$platformRevenue" },
          totalSellerRevenue: { $sum: "$sellerRevenue" },
        },
      },
    ]);

    // Monthly sales (current month)
    const currentDate = new Date();
    const firstDayOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1,
    );

    const monthlyResults = await Order.aggregate([
      { $match: { createdAt: { $gte: firstDayOfMonth } } },
      { $unwind: "$products" },
      { $match: { "products.product": toObjectId(productId) } },
      {
        $group: {
          _id: "$handledBy",
          monthlyQuantity: { $sum: "$products.quantity" },
          monthlyOrders: { $sum: 1 },
          monthlyRevenue: {
            $sum: {
              $multiply: ["$products.quantity", "$products.price"],
            },
          },
          monthlyPlatformRevenue: {
            $sum: {
              $multiply: [
                "$products.quantity",
                "$products.price",
                { $cond: [{ $eq: ["$handledBy", "platform"] }, 0.15, 0] },
              ],
            },
          },
          monthlySellerRevenue: {
            $sum: {
              $multiply: [
                "$products.quantity",
                "$products.price",
                { $cond: [{ $eq: ["$handledBy", "platform"] }, 0.85, 1] },
              ],
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          byHandler: { $push: "$$ROOT" },
          monthlyQuantity: { $sum: "$monthlyQuantity" },
          monthlyOrders: { $sum: "$monthlyOrders" },
          monthlyRevenue: { $sum: "$monthlyRevenue" },
          monthlyPlatformRevenue: { $sum: "$monthlyPlatformRevenue" },
          monthlySellerRevenue: { $sum: "$monthlySellerRevenue" },
        },
      },
    ]);

    // Format response data
    const result = salesResults[0] || {};
    const monthlyData = monthlyResults[0] || {};

    const responseData = {
      product: {
        id: product._id,
        name: product.name,
        price: product.price,
      },
      revenueBreakdown: {
        total: {
          platform: result.totalPlatformRevenue || 0,
          seller: result.totalSellerRevenue || 0,
          combined: result.totalRevenue || 0,
        },
        monthly: {
          platform: monthlyData.monthlyPlatformRevenue || 0,
          seller: monthlyData.monthlySellerRevenue || 0,
          combined: monthlyData.monthlyRevenue || 0,
        },
      },
      sales: {
        totalQuantity: result.totalQuantity || 0,
        totalOrders: result.totalOrders || 0,
        monthlyQuantity: monthlyData.monthlyQuantity || 0,
        monthlyOrders: monthlyData.monthlyOrders || 0,
      },
      byHandler: {
        platform: result.byHandler?.find((h) => h._id === "platform") || {},
        seller: result.byHandler?.find((h) => h._id === "seller") || {},
      },
      currency: "USD",
      lastUpdated: new Date(),
    };

    console.log("response data: ", responseData);
    res.status(200).json({
      status: "success",
      data: responseData,
    });
  } catch (err) {
    next(new APIError(err, 500));
  }
};

// Get product statistics
exports.getProductStats = async (req, res) => {
  try {
    const stats = await Product.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalValue: { $sum: "$price" },
        },
      },
      {
        $project: {
          status: "$_id",
          count: 1,
          totalValue: 1,
          _id: 0,
        },
      },
    ]);

    const totalProducts = await Product.countDocuments();
    const pendingCount = stats.find((s) => s.status === "pending")?.count || 0;
    const activeCount = stats.find((s) => s.status === "activated")?.count || 0;

    res.json({
      success: true,
      data: {
        totalProducts,
        pendingCount,
        activeCount,
        byStatus: stats,
      },
    });
  } catch (error) {
    console.error("Error fetching product stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch product statistics",
      error: error.message,
    });
  }
};
