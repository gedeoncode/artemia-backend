// admin manage orders
const Order = require("../../models/Order.model");
const {APIError} = require("../../utils/AppError");

const { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } = require("../../helpers/constants");

exports.getAllOrders = async (req, res, next) => {
  try {
    // Validate and sanitize input parameters
    const {
      search = "",
      status,
      handledBy,
      page = 1,
      limit = DEFAULT_PAGE_SIZE,
      sort = "date_desc",
      startDate,
      endDate,
    } = req.query;

    // Validate numerical parameters
    const parsedPage = Math.max(1, parseInt(page)) || 1;
    const parsedLimit = Math.min(
      parseInt(limit) || DEFAULT_PAGE_SIZE,
      MAX_PAGE_SIZE || 100
    );

    // Build query object
    const query = {};

    // Search functionality
    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      query.$or = [
        { orderNumber: searchRegex },
        { "client.name": searchRegex },
        { "client.email": searchRegex },
      ];
    }

    // Status filter
    if (status && status !== "all") {
      query.status = { $in: status.split(",") };
    }

    // HandledBy filter
    if (handledBy && handledBy !== "all") {
      query.handledBy = { $in: handledBy.split(",") };
    }

    // Date range filter
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
      };
    } else if (startDate) {
      query.createdAt = { $gte: new Date(startDate) };
    } else if (endDate) {
      query.createdAt = {
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
      };
    }

    // Sorting options
    const sortOptions = {
      date_asc: { createdAt: 1 },
      date_desc: { createdAt: -1 },
      price_asc: { total: 1 },
      price_desc: { total: -1 },
    };
    const sortOption = sortOptions[sort] || sortOptions.date_desc;

    // Count total documents
    const totalPromise = Order.countDocuments(query);

    // Fetch orders with optimized query
    const ordersPromise = Order.find(query)
      .sort(sortOption)
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit)
      .populate({
        path: "client",
        select: "name email",
        options: { lean: true },
      })
      .populate({
        path: "products.product",
        select: "name price images",
        options: { lean: true },
      })
      .populate({
        path: "seller",
        select: "businessName email",
        options: { lean: true },
      })
      .lean();

    // Execute both queries in parallel
    const [total, orders] = await Promise.all([totalPromise, ordersPromise]);

    // Cache control headers
    res.setHeader("Cache-Control", "private, max-age=60");

    return res.json({
      success: true,
      data: {
        orders,
        pagination: {
          total,
          page: parsedPage,
          limit: parsedLimit,
          totalPages: Math.ceil(total / parsedLimit),
        },
      },
    });
  } catch (err) {
    console.error(`Error fetching orders: ${err.message}`, {
      query: req.query,
      stack: err.stack,
    });

    if (err.name === "CastError" || err.name === "ValidationError") {
      next(new APIError("Invalid query parameters", 400));
    } else {
      next(
        new APIError("Failed to retrieve orders. Please try again later.", 500)
      );
    }
  }
};

exports.getOrderDetails = async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate("client", "name email phone")
    .populate("seller", "name email")
    .populate("products.product", "name price images seller")
    .populate({
      path: "products.product",
      select: "name images price seller",
      populate: {
        path: "seller",
        select: " name email ",
      },
    })
    .populate("deliveryAddress")
    .lean();

  if (!order) return res.status(404).json({ message: "Order not found" });

  res.json(order);
};

// const getOrderById = async (req, res) => {
//   try {
//     const { id } = req.params;
//     if (!mongoose.Types.ObjectId.isValid(id)) {
//       return res.status(400).json({ error: "Invalid order ID" });
//     }

//     const order = await Order.findById(id)
//       .populate("products.product")
//       .populate("products.seller")
//       .lean();

//     if (!order) return res.status(404).json({ error: "Order not found" });

//     res.json(order);
//   } catch (err) {
//     console.error("Error fetching order:", err);
//     res.status(500).json({ error: "Server error" });
//   }
// };

// // PATCH /api/admin/orders/:id/status
// const updateOrderStatus = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { status } = req.body;

//     const validStatuses = [
//       "Pending",
//       "Processing",
//       "Shipped",
//       "Delivered",
//       "Cancelled",
//     ];

//     if (!validStatuses.includes(status)) {
//       return res.status(400).json({ error: "Invalid status value" });
//     }

//     const order = await Order.findById(id);
//     if (!order) return res.status(404).json({ error: "Order not found" });

//     order.status = status;
//     order.statusHistory.push({
//       status,
//       changedBy: req.admin?.email || "System",
//       changedAt: new Date(),
//     });

//     await order.save();

//     res.json({ message: "Status updated successfully", status });
//   } catch (err) {
//     console.error("Error updating status:", err);
//     res.status(500).json({ error: "Server error" });
//   }
// };

// exports.updateOrderStatus = async (req, res) => {
//   const { status } = req.body;

//   const order = await Order.findById(req.params.id);
//   if (!order) return res.status(404).json({ message: 'Order not found' });

//   order.status = status;
//   await order.save();

//   res.json({ message: 'Order status updated', order });
// };

// routes/admin/orders.js
exports.updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const allowedStatuses = [
    "pending",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
  ];

  if (!allowedStatuses.includes(status)) {
    console.log("Invalid status: ", status);
    return res.status(400).json({ message: "Invalid status" });
  }

  const order = await Order.findById(id);
  if (!order) {
    console.log("Order not found: ", order);

    return res.status(404).json({ message: "Order not found" });
  }

  // Optional: Validate status flow (e.g., can't go from delivered to pending)
  const current = order.status;
  const illegalReversal = current === "delivered" && status === "pending";
  if (illegalReversal) {
    console.log("Invalid status transition ", illegalReversal);

    return res.status(400).json({ message: "Invalid status transition" });
  }

  order.status = status;
  await order.save();

  res.json({ success: true });
};
