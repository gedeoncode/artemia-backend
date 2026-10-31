const Order = require("../../models/Order.model");
const Product = require("../../models/Product.model");
const Notification = require("../../models/Notification.model");
const Address = require("../../models/Address.model");
const Admin = require("../../models/Admin.model");
const { default: mongoose } = require("mongoose");
const { notificationQueue } = require("../../queue/notification.queue");
const { validateProducts } = require("../../helpers/order/validateProducts");
const {
  validateDeliveryDate,
} = require("../../helpers/order/validateDeliveryDate");
const {
  validateNewAddress,
} = require("../../helpers/order/validateNewAddress");
const {
  handleAddressLogic,
} = require("../../helpers/order/handleAddressLogic");

const ValidationError = require("../../utils/errors/validationError");
const getNextSequence = require("../../utils/getNextSequence");
const { STOCK_TRACKED_NATURES } = require("../../constants/product.constants");
const {
  sendNotificationsAndEmails,
} = require("../../services/order/sendNotificationsAndEmails");
const { pricingSnapshot } = require("../../helpers/pricing.helper");

exports.createOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      products,
      paymentMethod = "cash_on_delivery",
      deliveryDate,
      addressId,
      newAddress,
      saveNewAddress,
      setDefault = false,
    } = req.body ?? {}
    // console.log("Payload:", req.body)

    // Generate order number
    const orderNumber = await getNextSequence("CDE", { addRandomSuffix: true });

    // Validate inputs
    await validateProducts(products);
    await validateDeliveryDate(deliveryDate, res);
    await validateNewAddress(newAddress, res);

    // Map cart items for O(1) lookup
    const cartMap = new Map(products.map((p) => [String(p.product), p]));

    // Fetch products with seller and category populated
    const productIds = products.map((p) => p.product);
    const dbProducts = await Product.find({ _id: { $in: productIds } })
      .populate("category") // to access category.nature
      .populate({
        path: "seller",
        select: "user",
        populate: {
          path: "user",
          select: "phone name email",
        },
      })
      .session(session)
      .lean();

    if (dbProducts.length !== products.length) {
      return res.status(400).json({
        message: "One or more products not found.",
        userMessage:
          "Some products in your cart could not be found. Please refresh and try again.",
      });
    }

    // Pre-check stock for stock-tracked products
    for (const dbProduct of dbProducts) {
      const cartItem = cartMap.get(String(dbProduct._id));
      if (!cartItem) continue;

      if (
        STOCK_TRACKED_NATURES.includes(dbProduct.category.nature || "product")
      ) {
        if (dbProduct.stock < cartItem.quantity) {
          return res.status(400).json({
            message: "Insufficient stock",
            userMessage: `Sorry, "${dbProduct.name}" doesn't have enough stock available.`,
            product: dbProduct._id,
            availableStock: dbProduct.stock,
          });
        }
      }
    }

    // Group products by seller
    const productsBySeller = {};
    for (const dbProduct of dbProducts) {
      const sellerId = dbProduct.seller._id.toString();
      const cartItem = cartMap.get(String(dbProduct._id));
      const pricing = pricingSnapshot(dbProduct);

      if (!productsBySeller[sellerId]) {
        productsBySeller[sellerId] = {
          products: [],
          seller: dbProduct.seller,
        };
      }

      productsBySeller[sellerId].products.push({
        ...cartItem,
        category: dbProduct.category, // include category for stock tracking
        lineTotalMinor: pricing.effectivePriceMinor * cartItem.quantity,
        pricing: {
          currencyCode: pricing.currencyCode,

          originalPriceMinor: pricing.originalPriceMinor,

          effectivePriceMinor: pricing.effectivePriceMinor,

          discountAmountMinor: pricing.discountAmountMinor,

          discountPercentage: pricing.discountPercentage,
        },
      });
    }

    // Handle address logic
    const { deliveryAddressId, customAddress } = await handleAddressLogic({
      addressId,
      newAddress,
      saveNewAddress,
      setDefault,
      userId: req.user.id,
      session,
    });

    // Get active admins
    const activeAdmins = await Admin.find({ isSuperAdmin: true }).session(
      session,
    );

    const createdOrders = [];
    const allBulkProductUpdates = [];

    // Process each seller's order
    for (const sellerId in productsBySeller) {
      const {
        products: sellerProducts,
        seller,
      } = productsBySeller[sellerId];

      // Create order
      const [newOrder] = await Order.create(
        [
          {
            client: req.user.id,
            seller: sellerId,
            products: sellerProducts.map((p) => ({
              product: p.product,
              quantity: p.quantity,
              pricing: p.pricing,
            })),
            pricing: {
              itemsPriceMinor: sellerProducts.reduce(
                (sum, p) => sum + p.lineTotalMinor,
                0,
              ),
              totalPriceMinor: sellerProducts.reduce(
                (sum, p) => sum + p.lineTotalMinor,
                0,
              ),
            },
            payment: {
              method: paymentMethod,
            },
            deliveryDate,
            deliveryAddress: deliveryAddressId,
            customAddress,
            handledBy: "seller",
            orderNumber,
          },
        ],
        { session },
      );

      createdOrders.push(newOrder);

      // Prepare bulk stock updates for stock-tracked products
      const bulkProductUpdates = sellerProducts
        .filter((p) =>
          STOCK_TRACKED_NATURES.includes(p.category.nature || "na"),
        )
        .map(({ product, quantity }) => ({
          updateOne: {
            filter: { _id: product, stock: { $gte: quantity } }, // atomic stock check
            update: { $inc: { stock: -quantity, sales: quantity } },
          },
        }));

      allBulkProductUpdates.push(...bulkProductUpdates);
      // Send notifications/emails asynchronously
      await sendNotificationsAndEmails({
        newOrder,
        sellerProducts,
        sellerId,
        seller,
        userId: req.user.id,
        user: req.user,
        orderNumber,
        session,
        activeAdmins,
        customAddress,
        deliveryAddressId,
      });
    }

    // Bulk update product stock
    if (allBulkProductUpdates.length > 0) {
      const result = await Product.bulkWrite(allBulkProductUpdates, {
        session,
      });

      // Abort transaction if any stock update failed
      if (result.matchedCount !== allBulkProductUpdates.length) {
        throw new ValidationError({
          message: "Stock changed during order processing",
          userMessage:
            "One or more items became unavailable while placing your order.",
        });
      }
    }

    // Notify admins for multi-seller orders
    if (Object.keys(productsBySeller).length > 1) {
      try {
        await notificationQueue.add({
          notificationData: {
            recipients: activeAdmins.map((admin) => ({
              userType: "Admin",
              userId: admin._id,
            })),
            type: "ADMIN_ALERT",
            title: "Multi-Seller Order Placed",
            message: `A customer has placed an order spanning ${
              Object.keys(productsBySeller).length
            } sellers`,
            link: "/admin/orders",
            metadata: {
              customerId: req.user.id,
              orderCount: Object.keys(productsBySeller).length,
            },
          },
        });
      } catch (error) {
        console.error("Failed to add multi-seller notification:", error);
      }
    }

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      message: "Orders placed successfully",
      userMessage:
        "Your order has been placed successfully! Thank you for shopping with us.",
      orders: createdOrders,
    });
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    session.endSession();

    console.error("Order creation error:", error);

    if (error instanceof ValidationError) {
      return res.status(400).json({
        message: error.message,
        userMessage: error.userMessage,
        details: error.details || undefined,
      });
    }

    return res.status(500).json({
      message: "Failed to create order",
      userMessage:
        "Sorry, something went wrong while placing your order. Please try again later.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.getMyOrders = async (req, res) => {
  const userId = req.user.id;
  if (!userId) {
    return res.status(401).json({
      message: "User not authenticated",
      userMessage: "Please log in to view your orders.",
    });
  }
  const orders = await Order.find({ client: userId })
    .populate("products.product")
    .sort({ createdAt: -1 });
  if (!orders || orders.length === 0) {
    return res.status(404).json({
      message: "No orders found",
      userMessage: "You have not placed any orders yet.",
    });
  }
  res.json(orders);
};
exports.allOrders = async (req, res) => {
  const orders = await Order.find({})
    .populate("products")
    .populate("seller", "name email")
    .populate("deliveryAddress")
    .sort({ createdAt: -1 });
  res.json(orders);
};
exports.allOrders = async (req, res) => {
  const orders = await Notification.find({}).sort({ createdAt: -1 });
  res.json({ orders });
};

exports.cancelOrder = async (req, res) => {
  const { id } = req.params;

  const order = await Order.findOne({ _id: id, user: req.user.id });
  if (!order) return res.status(404).json({ message: "Order not found" });

  if (order.status !== "pending") {
    return res
      .status(400)
      .json({ message: " Only pending orders can be cancelled " });
  }

  order.status = "cancelled";
  await order.save();

  res.json({ message: "Order cancelled successfully" });
};

exports.getClientAddresses = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!userId) {
      return res.status(400).json({ message: "User not authenticated" });
    }
    const addresses = await Address.find({ client: userId }).sort({
      isDefault: -1,
      createdAt: -1,
    });

    res.status(200).json({ data: addresses });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch addresses" });
  }
};

// addressId: "addressId" is the address id to be used for the order
exports.getClientAddress = async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({
      message: "Address ID is required",
      userMessage: "Please provide a valid address ID for the order.",
    });
  }

  const address = await Address.findOne({
    _id: id,
    client: req.user.id,
  });

  if (!address) {
    return res.status(404).json({
      message: "Address not found",
      userMessage: "The specified address could not be found.",
    });
  }

  res.status(200).json({
    message: "Address found",
    userMessage: "Address retrieved successfully.",
    data: address,
  });
};

exports.getOrderById = async (req, res) => {
  const { id } = req.params;
  try {
    if (!id) {
      return res.status(400).json({
        message: "Order ID is required",
        userMessage: "Please provide a valid order ID.",
      });
    }
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid order ID" });
    }
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        message: "User not authenticated",
        userMessage: "Please log in to view your order details.",
      });
    }

    const order = await Order.findOne({ _id: id, client: req.user.id })
      .populate("products.product")
      .populate("deliveryAddress");
    if (!order) {
      return res.status(404).json({
        message: "Order not found",
        userMessage: "The specified order could not be found.",
      });
    }
    res.status(200).json({
      order,
    });
  } catch (error) {
    console.error("Error fetching order by ID:", error);
    res.status(500).json({
      message: "Failed to fetch order",
      userMessage:
        "Sorry, we couldn't retrieve the order details. Please try again later.",
    });
  }
};
