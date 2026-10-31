const { invalidateCategoryCache } = require("../lib/invalidateCategoryCache");
const Category = require("../models/category.model");

const { redisClient } = require("../config/redis.config");
const { buildCacheKey } = require("../utils/cacheKeys");
class CategoryService {
  // -------------------------
  // Get all categories (paginated + filtered)
  // -------------------------
  static async getAllCategories({
    page = 1,
    limit = 50,
    sort = "name",
    order = "asc",
    parent = null,
    includeDeleted = false,
    search = "",
  }) {
    const skip = (Number(page) - 1) * Number(limit);
    const sortOrder = order === "desc" ? -1 : 1;

    const cacheKey = buildCacheKey("categories:list", {
      page,
      limit,
      sort,
      order,
      parent,
      includeDeleted,
      search,
    });

    // Try cache
    const cached = await redisClient.get(cacheKey);
    if (cached) return { source: "cache", ...JSON.parse(cached) };

    // Build MongoDB query
    const query = {};
    if (!includeDeleted) query.isDeleted = false;
    if (parent) query.parent = parent;
    if (search) query.$text = { $search: search };

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

    // Cache result
    await redisClient.set(cacheKey, JSON.stringify(response), "EX", 600);
    return response;
  }

  // -------------------------
  // Get category tree (recursive)
  // -------------------------
  static async getCategoryTree({
    includeDeleted = false,
    rootOnly = true,
    maxDepth = null,
  }) {
    const cacheKey = buildCacheKey("cat:tree", {
      includeDeleted,
      rootOnly,
      maxDepth,
    });

    // Try cache
    const cached = await redisClient.get(cacheKey);
    if (cached) return { source: "cache", tree: JSON.parse(cached) };

    // Fetch all categories once
    const query = includeDeleted ? {} : { isDeleted: false };
    const categories = await Category.find(query).lean();

    const map = new Map();
    categories.forEach((cat) =>
      map.set(String(cat._id), { ...cat, children: [] }),
    );

    const visited = new Set();

    const buildNode = (node, depth = 0) => {
      const idStr = String(node._id);
      if (visited.has(idStr)) return null;
      visited.add(idStr);

      if (maxDepth !== null && depth >= Number(maxDepth)) return node;

      categories
        .filter((c) => String(c.parent) === idStr)
        .forEach((child) => {
          const childNode = map.get(String(child._id));
          const built = buildNode(childNode, depth + 1);
          if (built) node.children.push(built);
        });

      visited.delete(idStr);
      return node;
    };

    const roots = [];
    map.forEach((node) => {
      if (!node.parent) roots.push(node);
    });

    const tree = rootOnly
      ? roots.map((root) => buildNode(root))
      : categories.map((cat) => buildNode(map.get(String(cat._id))));

    // Cache result
    await redisClient.set(cacheKey, JSON.stringify(tree), "EX", 600);

    return { source: "db", tree };
  }

  // -------------------------
  // Invalidate caches for categories
  // -------------------------
  static async invalidateCache() {
    await invalidateCategoryCache();
  }

  // -------------------------
  // Convenience methods for create/update/delete
  // Auto-invalidate cache after changes
  // -------------------------
  static async createCategory(data) {
    const category = new Category(data);
    const saved = await category.save();
    await this.invalidateCache();
    return saved;
  }

  static async updateCategory(id, patch) {
    const updated = await Category.findByIdAndUpdate(id, patch, {
      new: true,
      runValidators: true,
    }).lean();
    await this.invalidateCache();
    return updated;
  }

  static async deleteCategory(id) {
    const deleted = await Category.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true },
    ).lean();
    await this.invalidateCache();
    return deleted;
  }
}

module.exports = CategoryService;
