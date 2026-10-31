const Category = require("../models/category.model.js");
const Product = require("../models/Product.model.js");
const { redisClient } = require("../config/redis.config");
const { validateObjectId } = require("../validators/validate.id.js");
const { toObjectId } = require("../utils/toObjectId.js");

exports.getHomePageProducts = async (req, res) => {
  try {
    const cacheKey = "home:products:v1";

    // Check Redis cache
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return res.status(200).json({
        source: "cache",
        data: JSON.parse(cached),
      });
    }

    // DB Query
    const popularByCategory = await Product.aggregate([
      { $match: { isDeleted: false } },

      // Group by category
      {
        $group: {
          _id: "$category",
          products: {
            $push: {
              id: "$_id",
              name: "$name",
              description: "$description",
              images: "$images",
              stock: "$stock",
              prix: "$prix",
            },
          },
        },
      },

      // Lookup category details
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },

      // Final projection
      {
        $project: {
          _id: 0,
          categoryName: "$category.name",
          products: { $slice: ["$products", 8] },
        },
      },

      { $limit: 5 },
    ]);

    const responseData = { popularByCategory };

    // Cache result for 1 hour
    await redisClient.set(cacheKey, JSON.stringify(responseData), "EX", 3600);

    return res.status(200).json({
      source: "db",
      data: responseData,
    });
  } catch (error) {
    console.error("Error fetching home page products:", error);
    res.status(500).json({ message: "Failed to fetch home page products" });
  }
};

exports.getNewestProductsPaginated = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const products = await Product.find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalProducts = await Product.countDocuments({ isDeleted: false });
    const totalPages = Math.ceil(totalProducts / limit);

    res.status(200).json({
      products,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error("Pagination Error:", error);
    res.status(500).json({ message: "Failed to fetch newest products" });
  }
};

exports.getSpecialDeals = async (req, res) => {
  try {
    const today = new Date();

    const deals = await Product.find({
      isDeal: true,
      isDeleted: false,
      $or: [
        { dealExpiry: { $gte: today } },
        { dealExpiry: { $exists: false } }, // if no expiry
      ],
    })
      .sort({ createdAt: -1 })
      .limit(20); // show latest 20 deals

    res.status(200).json({ deals });
  } catch (error) {
    console.error("Special Deals Error:", error);
    res.status(500).json({ message: "Failed to fetch special deals" });
  }
};

exports.getRandomProducts = async (req, res) => {
  try {
    const randomProducts = await Product.aggregate([
      { $match: { isDeleted: false } }, // only active products
      { $sample: { size: 20 } }, // randomly pick 20 products
    ]);

    res.status(200).json({ random: randomProducts });
  } catch (error) {
    console.error("Random Picks Error:", error);
    res.status(500).json({ message: "Failed to fetch random products" });
  }
};

exports.searchSuggestions = async (req, res) => {
  try {
    const { query } = req.query; // Extract ?query=... from the URL

    // —— Basic validation ——
    if (!query || !query.trim()) {
      console.warn("[SearchController] Empty search query");
      return res.status(400).json({
        success: false,
        error: "Search query is required and cannot be empty",
      });
    }

    // —— Query MongoDB (name + tags) ——
    const suggestions = await Product.find({
      $or: [
        { name: { $regex: query.trim(), $options: "i" } },
        { tags: { $regex: query.trim(), $options: "i" } },
      ],
    })
      .limit(10)
      .select("name images _id") // only the fields the dropdown needs
      .lean(); // return plain JS objects (faster)

    return res.status(200).json({
      success: true,
      count: suggestions.length,
      data: suggestions,
    });
  } catch (error) {
    console.error(`[SearchController] Error fetching suggestions: ${error}`);
    return res.status(500).json({
      success: false,
      error: "An unexpected error occurred while processing your request",
    });
  }
};

exports.searchAndFilterProducts = async (req, res) => {
  try {
    const {
      query = "",
      category = "",
      minPrice,
      maxPrice,
      sortBy,
      page = 1,
      limit = 12,
    } = req.query;

    const safeLimit = Math.min(Math.max(parseInt(limit) || 12, 1), 100);
    const safePage = Math.max(parseInt(page) || 1, 1);
    const skip = (safePage - 1) * safeLimit;

    const filter = { isDeleted: false };

    // Safe regex to avoid ReDoS
    if (query.trim().length > 0) {
      const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.name = new RegExp(safeQuery, "i");
    }

    // Category filter (lookup by slug)
    if (category) {
      const cat = await Category.findOne({ slug: category }).lean();
      if (cat?._id) filter.category = cat._id;
    }

    // Price filters
    if (minPrice || maxPrice) {
      filter.price = {};
      if (!isNaN(minPrice)) filter.price.$gte = Number(minPrice);
      if (!isNaN(maxPrice)) filter.price.$lte = Number(maxPrice);
    }

    // Sorting
    const sortOptions = {
      priceLowToHigh: { price: 1 },
      priceHighToLow: { price: -1 },
      newest: { createdAt: -1 },
    }[sortBy] || { createdAt: -1 };

    const pipeline = [
      { $match: filter },

      ...(query.trim().length > 0
        ? [
            {
              $addFields: {
                exactMatchScore: {
                  $cond: [
                    { $eq: [{ $toLower: "$name" }, query.toLowerCase()] },
                    1,
                    0,
                  ],
                },
              },
            },
          ]
        : []),

      {
        $group: {
          _id: "$_id",
          doc: { $first: "$$ROOT" },
        },
      },

      // Sort using inner doc
      {
        $sort: {
          "doc.exactMatchScore": -1,
          ...(sortOptions.price
            ? { "doc.price": sortOptions.price }
            : { "doc.createdAt": sortOptions.createdAt }),
        },
      },

      { $skip: skip },
      { $limit: safeLimit },

      // Final projection: only allowed fields
      {
        $project: {
          _id: 1,
          name: "$doc.name",
          description: "$doc.description",
          images: "$doc.images",
          price: "$doc.price",
          stock: "$doc.stock",
          category: "$doc.category",
        },
      },
    ];

    const products = await Product.aggregate(pipeline);
    const total = await Product.countDocuments(filter);

    res.status(200).json({
      success: true,
      meta: {
        total,
        page: safePage,
        pages: Math.ceil(total / safeLimit),
        limit: safeLimit,
      },
      data: products,
    });
  } catch (error) {
    console.error("Search & Filter Error:", error);

    res.status(500).json({
      success: false,
      error: {
        message: "Internal server error",
        code: "PRODUCT_SEARCH_FAILURE",
      },
    });
  }
};

// recent viewed without user auth
exports.getRecentlyViewedProducts = async (req, res) => {
  try {
    const { ids } = req.query;
    if (!ids) {
      return res.status(400).json({ message: "No product IDs provided." });
    }

    // Convert comma-separated string to array
    const productIds = ids
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    if (!productIds.length) {
      return res.status(400).json({ message: "Invalid product IDs." });
    }

    // Query (much faster than aggregation)
    const products = await Product.find({
      _id: { $in: productIds },
      isDeleted: false,
    })
      .populate({ path: "category", select: "name " })
      .select("name price images stock category")
      .lean(); // boosts performance by returning plain JS objects

    res.status(200).json({ data: products });
  } catch (error) {
    console.error("Recently Viewed Products Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.getRelatedProducts = async (req, res) => {
  try {
    const { id } = req.params;
    let { limit = 10 } = req.query;

    if (!validateObjectId(id)) {
      return res.status(400).json({ message: "Invalid product ID." });
    }

    // Sanitize limit
    limit = Math.min(parseInt(limit) || 10, 50);

    // Get product with category populated
    const product = await Product.findById(id)
      .populate({
        path: "category",
        select: "name description",
      })
      .lean();
      
      if (!product || product.isDeleted) {
      return res.status(404).json({ message: "Product not found." });
    }
    // Randomized related products
    const relatedProducts = await Product.aggregate([
      {
        $match: {
          category: product.category._id,
          isDeleted: false,
          _id: { $ne: product._id },
        },
      },
      { $sample: { size: limit } }, // RANDOMIZE results
      {
        $lookup: {
          from: "categories", // your categories collection name
          localField: "category",
          foreignField: "_id",
          as: "categoryInfo",
        },
      },
      { $unwind: "$categoryInfo" },
      {
        $project: {
          name: 1,
          price: 1,
          images: 1,
          stock: 1,
          category: {
            name: "$categoryInfo.name",
            description: "$categoryInfo.description",
          },
        },
      },
    ]);
    
    res.status(200).json({ data: relatedProducts });
  } catch (error) {
    console.error("Get Related Products Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};
exports.getProductSection = async (req, res) => {
  try {
    const cacheKey = "home:sections:v1";
    const cached = await redisClient.get(cacheKey);

    if (cached) {
      return res
        .status(200)
        .json({ source: "cache", success: true, data: JSON.parse(cached) });
    }

    // ✅ Run all queries in parallel
    const [topDeals, bestSellers, newArrivals] = await Promise.all([
      Product.find(
        { isDeleted: false },
        {
          name: 1,
          images: 1,
          price: 1,
          originalPrice: 1,
          discount: 1,
        },
      )
        .sort({ discount: -1 })
        .limit(10)
        .lean(),

      Product.find(
        { isDeleted: false },
        {
          name: 1,
          images: 1,
          price: 1,
          originalPrice: 1,
          discount: 1,
          sold: 1,
        },
      )
        .sort({ sold: -1 })
        .limit(10)
        .lean(),

      Product.find(
        { isDeleted: false },
        {
          name: 1,
          images: 1,
          price: 1,
          originalPrice: 1,
          discount: 1,
          createdAt: 1,
        },
      )
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

    const sections = [
      { title: "Top Deals", link: "/deals/top", products: topDeals },
      {
        title: "Best Sellers",
        link: "/deals/best-sellers",
        products: bestSellers,
      },
      { title: "New Arrivals", link: "/deals/new", products: newArrivals },
    ];

    // ✅ Cache result
    await redisClient.set(
      cacheKey,
      JSON.stringify(sections),
      "EX",
      3600, // 1 hour
    );

    res.status(200).json({ source: "db", success: true, data: sections });
  } catch (error) {
    console.error("Error fetching homepage products:", error);
    res.status(500).json({ message: "Server error" });
  }
};
