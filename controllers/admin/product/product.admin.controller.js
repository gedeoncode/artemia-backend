const Product = require("../../../models/Product.model");
const Order = require("../../../models/Order.model");
const mongoose = require("mongoose");
const { APIError } = require("../../../utils/AppError");
const { validateObjectId } = require("../../../validators/validate.id");
// Helper function to populate product references
const populateProduct = async (product) => {
  return await product
    .populate("category", "name")
    .populate("seller", "name email")
    .execPopulate();
};

// Get all products with pagination, filtering, and sorting
exports.getAllProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      search,
      sort,
      category,
      seller,
      billingStatus,
      inventoryStatus,
    } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const matchStage = {
      isDeleted: false,
    };

    // =========================================
    // 🔹 Filters
    // =========================================

    if (status) {
      matchStage["publication.status"] = status;
    }

    if (billingStatus) {
      matchStage.billingStatus = billingStatus;
    }

    if (inventoryStatus) {
      matchStage.inventoryStatus = inventoryStatus;
    }

    if (category) {
      matchStage.category = new mongoose.Types.ObjectId(category);
    }

    if (seller) {
      matchStage.seller = new mongoose.Types.ObjectId(seller);
    }

    // =========================================
    // 🔹 Sorting
    // =========================================

    let sortStage = { createdAt: -1 };

    switch (sort) {
      case "price_asc":
        sortStage = { "pricing.currentPriceMinor": 1 };
        break;

      case "price_desc":
        sortStage = { "pricing.currentPriceMinor": -1 };
        break;

      case "name_asc":
        sortStage = { name: 1 };
        break;

      case "name_desc":
        sortStage = { name: -1 };
        break;

      case "oldest":
        sortStage = { createdAt: 1 };
        break;

      default:
        sortStage = { createdAt: -1 };
    }

    // =========================================
    // 🔹 Aggregation Pipeline
    // =========================================
    const pipeline = [
      {
        $match: matchStage,
      },

      // Join category
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },

      {
        $unwind: {
          path: "$category",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Join seller
      {
        $lookup: {
          from: "sellers",
          localField: "seller",
          foreignField: "_id",
          as: "seller",
        },
      },

      {
        $unwind: {
          path: "$seller",
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    // =========================================
    // 🔹 Search
    // =========================================

    if (search) {
      pipeline.push({
        $match: {
          $or: [
            {
              name: {
                $regex: search,
                $options: "i",
              },
            },

            {
              description: {
                $regex: search,
                $options: "i",
              },
            },

            {
              "category.name": {
                $regex: search,
                $options: "i",
              },
            },

            {
              "seller.name": {
                $regex: search,
                $options: "i",
              },
            },
          ],
        },
      });
    }

    // =========================================
    // 🔹 Count Total
    // =========================================

    const totalPipeline = [...pipeline, { $count: "total" }];

    const totalResult = await Product.aggregate(totalPipeline);

    const total = totalResult[0]?.total || 0;

    // =========================================
    // 🔹 Fetch Paginated Data
    // =========================================

    pipeline.push(
      { $sort: sortStage },
      { $skip: skip },
      { $limit: limitNum },
    );

    const products = await Product.aggregate(pipeline);

    const totalPages = Math.ceil(total / limitNum);

    return res.status(200).json({
      success: true,

      data: products,

      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching products:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch products",
      error: error.message,
    });
  }
};

// Get single product by ID
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("category", "name")
      .populate(
        {
          path: "seller",
          populate : {
            path: "user",
            select: "name email"
          }
        }
      );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch product",
      error: error.message,
    });
  }
};
