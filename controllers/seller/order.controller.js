const { default: mongoose } = require("mongoose");
const Order = require("../../models/Order.model");
const { validateObjectId } = require("../../validators/validate.id");
const { toObjectId } = require("../../utils/toObjectId");

exports.getSellerOrders = async (req, res) => {
  try {
    const {
      status,
      dateFrom,
      dateTo,
      search,
      sort = "createdAt",
      order = "desc",
      page = 1,
      limit = 20,
    } = req.query;
    const sellerId = req?.seller?.id;
    if (!validateObjectId(sellerId)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized seller access.",
      });
    }

    // --- Base Filter ---
    const filter = {
      handledBy: "seller",
      seller: new mongoose.Types.ObjectId(sellerId),
      // isDeleted: false,
    };

    if (status) filter.status = status;
    // --- Date Range Filtering ---
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sortStage = { [sort]: order === "asc" ? 1 : -1 };

    // --- Build Aggregation Pipeline ---
    const pipeline = [
      { $match: filter },

      // Populate client
      {
        $lookup: {
          from: "users",
          localField: "client",
          foreignField: "_id",
          as: "client",
        },
      },
      { $unwind: { path: "$client", preserveNullAndEmptyArrays: true } },

      // Populate products
      {
        $lookup: {
          from: "products",
          localField: "products.product",
          foreignField: "_id",
          as: "items",
        },
      },

      // Populate delivery address
      {
        $lookup: {
          from: "addresses",
          localField: "deliveryAddress",
          foreignField: "_id",
          as: "deliveryAddress",
        },
      },
      {
        $unwind: { path: "$deliveryAddress", preserveNullAndEmptyArrays: true },
      },
    ];

    // --- Search Handling ---
    if (search) {
      const searchRegex = new RegExp(search, "i");
      pipeline.push({
        $match: {
          $or: [
            { "client.name": { $regex: searchRegex } },
            { "client.email": { $regex: searchRegex } },
            { "items.name": { $regex: searchRegex } },
            { "items.sku": { $regex: searchRegex } },
          ],
        },
      });
    }

    // --- Projection for performance ---
    pipeline.push({
      $project: {
        handledBy: 1,
        status: 1,
        totalPrice: 1,
        itemsPrice: 1,
        currency: 1,
        createdAt: 1,
        deliveryDate: 1,
        "client._id": 1,
        "client.name": 1,
        "client.email": 1,
        "deliveryAddress.address": 1,
        "deliveryAddress.city": 1,
        "deliveryAddress.state": 1,
        "deliveryAddress.notes": 1,
        "deliveryAddress.country": 1,
        "items._id": 1,
        "items.name": 1,
        "items.sku": 1,
        "items.price": 1,
        " items.stock": 1,
        "items.images": 1,
        payment: 1,
      },
    });

    // --- Sorting, Pagination, Count ---
    pipeline.push(
      { $sort: sortStage },
      { $skip: skip },
      { $limit: Number(limit) }
    );

    // --- Execute Queries in Parallel ---
    const [orders, totalCount] = await Promise.all([
      Order.aggregate(pipeline),
      Order.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      meta: {
        total: totalCount,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalCount / limit),
        count: orders.length,
      },
      data: orders,
    });
  } catch (err) {
    console.error("❌ Error fetching seller orders:", err);
    res.status(500).json({
      success: false,
      message: "An unexpected error occurred while fetching seller orders.",
    });
  }
};

// 📊 GET /api/seller/orders/stats
exports.getSellerOrderStats = async (req, res) => {
  try {
    const sellerId = req.seller.id;
    if (!validateObjectId(sellerId)) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const stats = await Order.aggregate([
      {
        $match: {
          handledBy: "seller",
          seller: new mongoose.Types.ObjectId(sellerId),
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalRevenue: { $sum: "$totalPrice" },
        },
      },
      {
        $project: {
          _id: 0,
          status: "$_id",
          count: 1,
          totalRevenue: 1,
        },
      },
    ]);

    res.json({
      stats,
      summary: {
        totalOrders: stats.reduce((a, s) => a + s.count, 0),
        totalRevenue: stats.reduce((a, s) => a + s.totalRevenue, 0),
      },
    });
  } catch (err) {
    console.error("Error fetching seller order stats:", err);
    res.status(500).json({ message: "Failed to fetch order stats" });
  }
};

// 🔄 PUT /api/seller/orders/:id/status
exports.updateSellerOrderStatus = async (req, res) => {
  try {
    const sellerId = req.seller.id; // Authenticated seller
    const { id } = req.params; // Order ID
    const { status } = req.body;
    const sellerObjectId = toObjectId(sellerId)
    // 1️⃣ Validate seller authorization
    if (!sellerId || !validateObjectId(sellerId)) {
      return res.status(403).json({ message: "Unauthorized seller" });
    }

    // 2️⃣ Define allowed statuses & transitions
    const validStatuses = [
      "pending",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid order status" });
    }

    // 3️⃣ Fetch the seller’s order
    const order = await Order.findOne({
      _id: id,
      seller: sellerObjectId,
      handledBy: "seller",
    });

    if (!order) {
      return res
        .status(404)
        .json({ message: "Order not found for this seller" });
    }

    // 4️⃣ Disallow further changes once delivered or cancelled
    if (["delivered", "cancelled"].includes(order.status)) {
      return res.status(400).json({
        message: `Cannot change status of an order that is already ${order.status}.`,
      });
    }

    // 5️⃣ Role-based restriction — sellers can’t mark as delivered
    if (status === "delivered") {
      return res.status(403).json({
        message:
          "Sellers cannot mark an order as delivered. That action is system or buyer confirmed.",
      });
    }

    // 6️⃣ Validate logical status transitions
    const allowedTransitions = {
      pending: ["processing", "cancelled"],
      processing: ["shipped", "cancelled"],
      shipped: ["cancelled"],
    };

    const currentStatus = order.status;
    const nextAllowed = allowedTransitions[currentStatus] || [];

    if (!nextAllowed.includes(status)) {
      return res.status(400).json({
        message: `Invalid transition from '${currentStatus}' to '${status}'. Allowed: ${nextAllowed.join(
          ", "
        )}`,
      });
    }

    // 7️⃣ Apply the new status
    order.status = status;
    order.updatedAt = Date.now();
    await order.save();

    // 8️⃣ Optional: Trigger event/notification (future hook)
    // notifyBuyer(order.buyer, `Your order is now ${status}`);

    return res.status(200).json({
      message: `Order status updated to '${status}' successfully`,
      order,
    });
  } catch (err) {
    console.error("Error updating seller order status:", err);
    res.status(500).json({ message: "Failed to update order status" });
  }
};


exports.getOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const sellerId = req.seller.id;

    if (!validateObjectId(id)) {
      return res.status(400).json({ message: "Invalid order ID." });
    }

    if (!validateObjectId(sellerId)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized seller access.",
      });
    }

    const pipeline = [
      {
        $match: {
          _id: new mongoose.Types.ObjectId(id),
          seller: new mongoose.Types.ObjectId(sellerId),
          handledBy: "seller",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "client",
          foreignField: "_id",
          as: "client",
        },
      },
      { $unwind: { path: "$client", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "products",
          localField: "products.product",
          foreignField: "_id",
          as: "items",
        },
      },
      {
        $lookup: {
          from: "addresses",
          localField: "deliveryAddress",
          foreignField: "_id",
          as: "deliveryAddress",
        },
      },
      {
        $unwind: { path: "$deliveryAddress", preserveNullAndEmptyArrays: true },
      },
      {
        $project: {
          handledBy: 1,
          status: 1,
          totalPrice: 1,
          itemsPrice: 1,
          currency: 1,
          createdAt: 1,
          deliveryDate: 1,
          products: 1,
          payment: 1,
          "client._id": 1,
          "client.name": 1,
          "client.email": 1,
          "deliveryAddress.address": 1,
          "deliveryAddress.city": 1,
          "deliveryAddress.state": 1,
          "deliveryAddress.country": 1,
          "deliveryAddress.notes": 1,
          "items._id": 1,
          "items.name": 1,
          "items.sku": 1,
          "items.price": 1,
          "items.stock": 1,
          "items.images": 1,
        },
      },
    ];

    const result = await Order.aggregate(pipeline);

    if (!result.length) {
      return res.status(404).json({
        success: false,
        message: "Order not found for this seller.",
      });
    }

    res.status(200).json({
      success: true,
      order: result[0],
    });
  } catch (err) {
    console.error("❌ Error fetching order by ID:", err);
    res.status(500).json({
      success: false,
      message: "An unexpected error occurred while fetching the order.",
    });
  }
};
