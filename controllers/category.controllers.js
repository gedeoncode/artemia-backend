const Category = require("../models/category.model");
const Product = require("../models/Product.model");
const { querySchema } = require("../validators/admin/category.schema");
const { buildCacheKey } = require("../utils/cacheKeys");
const { redisClient } = require("../config/redis.config");
const { toObjectId } = require("../utils/toObjectId");
const getFeaturedCategories = async (req, res) => {
  try {
    // 1. Find all featured categories
    const categories = await Category.find({ isFeatured: true });

    // 2. For each featured category, get a few products
    const featuredData = await Promise.all(
      categories.map(async (category) => {
        const products = await Product.find({
          category: category._id,
          isDeleted: false,
        })
          .sort({ createdAt: -1 })
          .limit(8); // get latest 8 products per category

        return {
          categoryId: category._id,
          categoryName: category.name,
          products,
        };
      }),
    );

    res.status(200).json({ featured: featuredData });
  } catch (error) {
    console.error("Featured Categories Error:", error);
    res.status(500).json({ message: "Failed to fetch featured categories" });
  }
};

const getCategoryTree = async (req, res) => {
  try {
    const { value: queryParams, error } = querySchema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid query parameters",
        errors: error.details.map((d) => d.message),
      });
    }

    const { includeDeleted, rootOnly, maxDepth } = queryParams;

    const cacheKey = buildCacheKey("cat:tree", {
      includeDeleted,
      rootOnly,
      maxDepth,
    });

    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return res
        .status(200)
        .json({ source: "cache", data: JSON.parse(cached) });
    }

    // -----------------------
    // Fetch categories
    // -----------------------
    const queryDB = includeDeleted ? {} : { isDeleted: false };
    const categories = await Category.find(queryDB).lean();

    // Index by id
    const nodeMap = new Map();
    categories.forEach((c) => {
      nodeMap.set(String(c._id), { ...c, children: [] });
    });

    // --------------------------------------------
    // 4. Build children lookup table (O(n))
    // --------------------------------------------
    const childrenByParent = {};

    for (const cat of categories) {
      const pid = cat.parent ? String(cat.parent) : null;

      if (!childrenByParent[pid]) childrenByParent[pid] = [];
      childrenByParent[pid].push(cat);
    }

    // --------------------------------------------
    // 5. Iterative tree construction
    // --------------------------------------------
    const buildTreeIterative = (rootNodes) => {
      const stack = rootNodes.map((r) => ({ node: r, depth: 0 }));

      while (stack.length) {
        const { node, depth } = stack.pop();
        const nodeId = String(node._id);

        if (maxDepth !== null && depth >= maxDepth) continue;

        const childCats = childrenByParent[nodeId] || [];
        for (const child of childCats) {
          const childNode = nodeMap.get(String(child._id));
          node.children.push(childNode);
          stack.push({ node: childNode, depth: depth + 1 });
        }
      }

      return rootNodes;
    };

    const roots =
      childrenByParent[null]?.map((c) => nodeMap.get(String(c._id))) || [];

    const tree = rootOnly
      ? buildTreeIterative(roots)
      : buildTreeIterative(categories.map((c) => nodeMap.get(String(c._id))));

    await redisClient.set(cacheKey, JSON.stringify(tree), "EX", 600);

    return res.status(200).json({ source: "db", data: tree });
  } catch (err) {
    console.log("error:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

const getAllCategories = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      sort = "name",
      order = "asc",
      parent = null,
      includeDeleted = false,
      search = "",
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const sortOrder = order === "desc" ? -1 : 1;

    // --------------------------------------------
    // 1. Build Redis cache key
    // --------------------------------------------
    const cacheKey = buildCacheKey("categories:list", {
      page,
      limit,
      sort,
      order,
      parent,
      includeDeleted,
      search,
    });

    // --------------------------------------------
    // 2. Redis check
    // --------------------------------------------
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return res.status(200).json({
        source: "cache",
        ...JSON.parse(cached),
      });
    }

    // --------------------------------------------
    // 3. Build MongoDB query
    // --------------------------------------------
    const query = {};

    if (!includeDeleted) query.isDeleted = false;
    if (parent) query.parent = parent;

    if (search) {
      query.$text = { $search: search }; // uses text index
    }

    // --------------------------------------------
    // 4. Fetch categories (lean for perf)
    // --------------------------------------------
    const [items, total] = await Promise.all([
      Category.find(query)
        .sort({ [sort]: sortOrder })
        .skip(skip)
        .limit(Number(limit))
        .lean(),

      Category.countDocuments(query),
    ]);

    const response = {
      source: "db",
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
      items,
    };

    // --------------------------------------------
    // 5. Cache the result (10 minutes)
    // --------------------------------------------
    await redisClient.set(cacheKey, JSON.stringify(response), "EX", 600);

    return res.status(200).json(response);
  } catch (err) {
    console.error("getAllCategories error:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};
const getCategoryNode = async (req, res) => {
  try {
    const { parentId = "null", includeDeleted = true, limit } = req.query;
    
    const parsedParent = parentId === "null" ? null : toObjectId(parentId);

    const cacheKey = `cat:node:${parsedParent}:${includeDeleted}:${limit || "all"}`;

    // --------------------------------------------
    // 1. Cache check
    // --------------------------------------------
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return res.json({
        source: "cache",
        data: JSON.parse(cached),
      });
    }

    // --------------------------------------------
    // 2. Base query
    // --------------------------------------------
    const match = {
      parent: parsedParent,
    };

    if (!includeDeleted) {
      match.isDeleted = false;
    }

    // --------------------------------------------
    // 3. Aggregation (FAST + hasChildren)
    // --------------------------------------------
    const pipeline = [
      { $match: match },

      // limit early if provided
      ...(limit ? [{ $limit: Number(limit) }] : []),

      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "parent",
          as: "children",
        },
      },

      {
        $addFields: {
          hasChildren: {
            $gt: [{ $size: "$children" }, 0],
          },
        },
      },

      {
        $project: {
          name: 1,
          slug: 1,
          parent: 1,
          hasChildren: 1,
        },
      },
    ];

    const categories = await Category.aggregate(pipeline);

    // --------------------------------------------
    // 4. Cache result
    // --------------------------------------------
    await redisClient.set(cacheKey, JSON.stringify(categories), "EX", 600);

    // --------------------------------------------
    // 5. Response
    // --------------------------------------------
    res.json({
      source: "db",
      data: categories,
    });
  } catch (err) {
    console.error("getCategoryNode error:", err);
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getCategoryTree,
  getAllCategories,
  getFeaturedCategories,
  getCategoryNode,
};
