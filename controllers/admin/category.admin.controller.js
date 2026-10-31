const Category = require("../../models/category.model");
const Product = require("../../models/Product.model");
const { validateObjectId } = require("../../validators/validate.id");
const { invalidateCategoryCache } = require("../../helpers/category_cache");
const {
  createCategorySchema,
} = require("../../validators/admin/category.schema");
const { createCategory } = require("../../services/admin/category.service");
const { redisClient } = require("../../config/redis.config");
const createCategoryController = async (req, res) => {
  console.log("Frontend data:", req.body)
  try {
    const { error, value } = createCategorySchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true, // remove unexpected fields
    });
    if (error) {
      console.log("Error:", error.details.map((d) => d.message))
      return res.status(422).json({
        success: false,
        message: "Validation error",
        errors: error.details.map((d) => d.message),
      });
    }
    const category = await createCategory(value);

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      category,
    });
  } catch (err) {
    console.error("Error creating category:", err);

    // 🔹 Handle duplicate slug error from Mongo
    if (err.code === 11000 && err.keyPattern?.slug) {
      return res.status(409).json({
        success: false,
        message: "Category with this slug already exists",
      });
    }

    // 🔹 Handle custom service errors
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
      });
    }

    // 🔹 Fallback 500
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Utility function to count all descendants recursively
const countDescendants = async (categoryId) => {
  const children = await Category.find({
    parent: categoryId,
    isDeleted: false,
  }).select("_id");

  if (!children.length) return 0;

  const counts = await Promise.all(
    children.map((child) => countDescendants(child._id)),
  );

  return children.length + counts.reduce((acc, curr) => acc + curr, 0);
};

const getAllCategories = async (req, res) => {
  try {
    const {
      search,
      status,
      type,
      isFeatured,
      parent,
      level,
      sortBy = "name",
      limit=10,
      page = 1,
    } = req.query;

    if (isNaN(page) || page < 1) {
      return res.status(400).json({ message: "Invalid page number" });
    }

    const MAX_PAGE_SIZE = 100;
    const pageSize = limit
      ? Math.min(parseInt(limit), MAX_PAGE_SIZE)
      : undefined;
    const skip = pageSize ? (parseInt(page) - 1) * pageSize : 0;

    const query = { isDeleted: false };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { slug: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    if (status) query.status = status;
    if (type) query.type = type;
    if (isFeatured !== undefined) query.isFeatured = isFeatured === "true";

    // Default to parent categories
    if (typeof parent !== "undefined") {
      query.parent = parent === "null" ? null : parent;
    } else {
      query.parent = null;
    }

    if (level) query.level = parseInt(level);

    const sortOptions = {};
    switch (sortBy) {
      case "createdAt":
        sortOptions.createdAt = -1;
        break;
      case "updatedAt":
        sortOptions.updatedAt = -1;
        break;
      case "level":
        sortOptions.level = 1;
        break;
      default:
        sortOptions.name = 1;
    }

    // Redis caching
    const cacheKey = `categories:parents-with-subcategories:${JSON.stringify({ ...req.query, parent: query.parent })}`;
    const skipCache = search || status || type || level;
    let cacheErrorOccurred = false;

    if (!skipCache) {
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          return res.status(200).json(JSON.parse(cached));
        }
      } catch (err) {
        console.error("Redis get error:", err);
        cacheErrorOccurred = true;
      }
    }

    // Fetch parent categories
    const parents = await Category.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(pageSize || 0)
      .lean();

    if (!parents.length) {
      return res.status(200).json({
        message: "No categories found",
        data: [],
        meta: { total: 0, page: parseInt(page), pageSize },
      });
    }

    const enhancedParents = await Promise.all(
      parents.map(async (parentCat) => {
        const [descendantCount, subcategories] = await Promise.all([
          countDescendants(parentCat._id),
          Category.find({ parent: parentCat._id, isDeleted: false })
            .select("name slug status isFeatured level")
            .lean(),
        ]);

        return {
          ...parentCat,
          descendantCount,
          subcategories,
        };
      }),
    );

    const totalCount = await Category.countDocuments(query);

    const response = {
      message: "Parent categories with subcategories retrieved successfully",
      data: enhancedParents,
      meta: {
        total: totalCount,
        page: parseInt(page),
        pageSize,
        totalPages: pageSize ? Math.ceil(totalCount / pageSize) : 1,
      },
    };

    if (!cacheErrorOccurred && !skipCache) {
      try {
        await redisClient.set(cacheKey, JSON.stringify(response), "EX", 60);
      } catch (err) {
        console.error("Redis set error:", err);
      }
    }
    return res.status(200).json(response);
  } catch (err) {
    console.error("getAllCategories error:", err);
    return res.status(500).json({
      message: "Error fetching categories",
      error: err.message,
    });
  }
};

// const getCategoryById = async (req, res) => {
//   const { id } = req.params;
//   try {
//     const category = await Category.findById(id)
//       .populate("parentCategory", "name slug image")
//       .populate("subcategories", "name slug level isActive image")

//       .lean();
//     if (!category) {
//       console.warn(`Category with ID ${id} not found`);
//       return res.status(404).json({ message: "Category not found" });
//     }
//     res.status(200).json({ message: "Category retrieved", category });
//   } catch (err) {
//     console.error("Error fetching category:", err);
//     res
//       .status(500)
//       .json({ message: "Failed to fetch category", error: err.message });
//   }
// };
// Update a category
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id)) {
      console.warn("Invalid category ID:", id);
      return res.status(400).json({ message: "Invalid category ID" });
    }
    const {
      name,
      description,
      parent,
      image,
      type,
      requiresPayment,
      isFeatured,
      status,
      slug,
      attributes,
    } = req.body;

    // Find the existing category
    const existingCategory = await Category.findById(id);
    if (!existingCategory) {
      console.warn(`Category with ID ${id} not found`);
      return res.status(404).json({
        message: "Category not found",
      });
    }

    // Validate that featured categories are active
    if (isFeatured && status !== "active") {
      console.warn("Featured category must be active");
      return res.status(400).json({
        message: 'Featured categories must have status "active"',
      });
    }

    // Check for existing category with same name (case-insensitive) excluding current category
    if (name && name !== existingCategory.name) {
      const duplicateNameCategory = await Category.findOne({
        name: { $regex: new RegExp(`^${name}$`, "i") },
        _id: { $ne: id }, // Exclude current category
      });

      if (duplicateNameCategory) {
        console.warn(`Category with name "${name}" already exists`);
        return res.status(400).json({
          message: "Category with this name already exists",
        });
      }
    }

    // If parent is provided, validate it exists and is active
    if (parent) {
      // Prevent setting self as parent
      if (parent === id) {
        console.warn("Category cannot be its own parent");
        return res.status(400).json({
          message: "Category cannot be its own parent",
        });
      }

      const parentCategory = await Category.findOne({
        _id: parent,
        status: "active",
        isDeleted: false,
      });

      if (!parentCategory) {
        console.warn(`Parent category with ID ${parent} not found or inactive`);
        return res.status(400).json({
          message: "Parent category not found or inactive",
        });
      }

      // Prevent creating circular references
      const isCircular = await checkCircularReference(id, parent);
      if (isCircular) {
        console.warn("Circular reference detected in category hierarchy");
        return res.status(400).json({
          message: "Circular reference in category hierarchy is not allowed",
        });
      }

      // Prevent creating categories beyond maximum depth
      if (parentCategory.level >= 5) {
        console.warn("Maximum category depth exceeded (5 levels max)");
        return res.status(400).json({
          message: "Maximum category depth exceeded (5 levels max)",
        });
      }
    }

    // Prepare update object with only changed fields
    const updateData = {
      name: name ?? existingCategory.name,
      description: description ?? existingCategory.description,
      parent: parent !== undefined ? parent : existingCategory.parent,
      image: image ?? existingCategory.image,
      type: type ?? existingCategory.type,
      requiresPayment: requiresPayment ?? existingCategory.requiresPayment,
      isFeatured: isFeatured ?? existingCategory.isFeatured,
      status: status ?? existingCategory.status,
      slug: slug ?? existingCategory.slug,
      attributes: attributes ?? existingCategory.attributes,
      updatedAt: new Date(),
    };

    // Only update slug if it's different from existing
    if (slug && slug !== existingCategory.slug) {
      updateData.slug = slug;
    }

    // Update the category
    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true },
    ).populate("parent", "name slug");

    if (!updatedCategory) {
      console.warn(`Failed to update category with ID ${id}`);
      return res.status(500).json({
        message: "Failed to update category",
      });
    }

    await invalidateCategoryCache();
    res.status(200).json({
      message: "Category updated successfully",
      category: updatedCategory,
    });
  } catch (err) {
    // Handle duplicate slug error specifically
    if (err.code === 11000 && err.keyPattern?.slug) {
      return res.status(400).json({
        message: "Category with this slug already exists",
      });
    }

    // Handle validation errors
    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map((el) => el.message);
      console.warn("Validation errors:", errors);
      return res.status(400).json({
        message: "Validation error",
        errors,
      });
    }

    console.error("Error updating category:", err);
    res.status(500).json({
      message: "Error updating category",
      error: err.message,
    });
  }
};

// Helper function to check for circular references in category hierarchy
async function checkCircularReference(categoryId, parentId) {
  let currentParentId = parentId;

  // Follow the parent chain up to 10 levels to detect cycles
  for (let i = 0; i < 10; i++) {
    if (currentParentId === categoryId) {
      return true; // Circular reference found
    }
    const parentCategory =
      await Category.findById(currentParentId).select("parent");
    if (!parentCategory || !parentCategory.parent) {
      return false; // No circular reference
    }

    currentParentId = parentCategory.parent.toString();
  }

  return false; // No circular reference detected within reasonable depth
}

//============ Delete a category =============//

const getAllDescendantCategoryIds = async (parentId) => {
  const ids = [];
  let queue = [parentId];

  while (queue.length > 0) {
    ids.push(...queue);
    const children = await Category.find({ parent: { $in: queue } }, "_id");
    queue = children.map((child) => child._id);
  }

  return ids;
};

const deleteCategory = async (req, res) => {
  const { id } = req.params;

  try {
    const category = await Category.findById(id);
    if (!category)
      return res.status(404).json({ message: "Category not found" });

    // Get all descendant category IDs
    const descendantIds = await getAllDescendantCategoryIds(id);
    const allCategoryIds = [id, ...descendantIds];

    // Check if any of them have products
    const productCount = await Product.countDocuments({
      category: { $in: allCategoryIds },
    });
    if (productCount > 0) {
      return res.status(400).json({
        message: "Cannot delete. One or more categories contain products.",
      });
    }

    // Delete all subcategories recursively
    await Category.deleteMany({ _id: { $in: allCategoryIds } });
    await invalidateCategoryCache();
    return res
      .status(200)
      .json({ message: "Category and subcategories deleted" });
  } catch (error) {
    console.error("Delete category error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

//========== Get breadcrumbs for a category -=======//
const getBreadcrumbs = async (req, res) => {
  try {
    const { categoryId } = req.params;

    // Validate the category ID
    if (!validateObjectId(id)) {
      return res.status(400).json({ message: "Invalid category ID" });
    }

    const breadcrumbs = [];
    let currentCategoryId = categoryId;

    // Limit the depth to prevent infinite loops
    let maxDepth = 10;

    while (currentCategoryId && maxDepth > 0) {
      const category = await Category.findById(currentCategoryId)
        .select("_id name slug parent")
        .lean();

      if (!category) {
        break;
      }

      breadcrumbs.unshift({
        _id: category._id.toString(),
        name: category.name,
        slug: category.slug,
      });

      currentCategoryId = category.parent?.toString();
      maxDepth--;
    }

    if (maxDepth === 0) {
      console.warn("Potential circular reference in category hierarchy");
    }

    return res.status(200).json(breadcrumbs);
  } catch (error) {
    console.error("Error fetching breadcrumbs:", error);
    return res.status(500).json({
      message: "Failed to fetch breadcrumbs",
      error: error.message,
    });
  }
};


const checkSlugAvailability = async (req, res) => {
  try {
    const { slug } = req.query;

    // Validate slug parameter
    if (!slug || typeof slug !== "string" || slug.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Slug must be at least 2 characters long",
      });
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return res.status(400).json({
        success: false,
        message:
          "Slug can only contain lowercase letters, numbers, and hyphens",
      });
    }

    // Check if slug exists in database
    const existingCategory = await Category.findOne({ slug })
      .select("_id") // Only select the ID field for efficiency
      .lean(); // Convert to plain JavaScript object

    return res.status(200).json({
      success: true,
      available: !existingCategory, // true if available, false if taken
    });
  } catch (error) {
    console.error("Error checking slug availability:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while checking slug availability",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const checkCodeAvailability = async (req, res) => {
  try {
    let { code } = req.query;

    // Validate code parameter
    if (!code || typeof code !== "string" || code.trim().length < 2) {
      console.log("Code must be at least 2 characters long", req.query)
      return res.status(400).json({
        success: false,
        message: "Code must be at least 2 characters long",
      });
    }

    // Normalize code
    code = code.trim().toUpperCase();

    // Validate code format
    if (!/^[A-Z0-9_-]+$/.test(code)) {
            console.log("Code can only contain uppercase letters, numbers, underscores, and hyphens")

      return res.status(400).json({
        success: false,
        message:
          "Code can only contain uppercase letters, numbers, underscores, and hyphens",
      });
    }

    // Check if code exists
    const existingCategory = await Category.findOne({ code })
      .select("_id")
      .lean();

    return res.status(200).json({
      success: true,
      available: !existingCategory,
      normalizedCode: code,
    });
  } catch (error) {
    console.error("Error checking code availability:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error while checking code availability",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

async function buildCategoryTreeRecursive(categoryId) {
  // Get main category
  const category = await Category.findById(categoryId).lean();
  if (!category) return null;

  // Fetch direct subcategories using indexed query
  const children = await Category.find({ parent: category._id }).lean();

  // Recursively populate subcategories
  const subcategories = await Promise.all(
    children.map((child) => buildCategoryTreeRecursive(child._id)),
  );
  return {
    ...category,
    subcategories: subcategories.filter(Boolean),
  };
}

const getCategoryTree = async (req, res) => {
  const { id } = req.params;
  // Validate ID
  if (!validateObjectId(id)) {
    return res.status(400).json({ error: "Invalid category ID" });
  }

  try {
    const cacheKey = `category-tree:${id}`;

    // Try to get from Redis
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    // Build the tree recursively
    const tree = await buildCategoryTreeRecursive(id);
    if (!tree) {
      return res.status(404).json({ error: "Category not found" });
    }

    // Cache in Redis (optional: expire after 6 hours)
    await redisClient.set(cacheKey, JSON.stringify(tree), "EX", 1 * 2 * 60);

    return res.status(200).json(tree);
  } catch (err) {
    console.error("Category tree error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

//Activate and deactivate category tree

const toggleCategoryStatus = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const { isActive } = req.body;
    console.log("Toggling category status for ID:", categoryId, "to", isActive);
    if (typeof isActive !== "boolean") {
      return res.status(400).json({ message: "Invalid isActive value." });
    }

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ message: "Category not found." });
    }

    if (!isActive) {
      const allCategoryIds = await getAllDescendantCategoryIds(categoryId);

      // MongoDB aggregation to find active products in any of those categories
      const [result] = await Product.aggregate([
        {
          $match: {
            category: { $in: allCategoryIds },
            isActive: true,
          },
        },
        { $limit: 1 }, // stop early if even one is found
      ]);

      if (result) {
        return res.status(400).json({
          message:
            "Cannot deactivate this category because it or its subcategories contain active products.",
        });
      }
    }

    // Recursive update using BFS
    const updateChildrenStatus = async (parentId) => {
      const queue = [parentId];

      while (queue.length > 0) {
        const currentId = queue.shift();
        await Category.findByIdAndUpdate(currentId, { isActive });

        const children = await Category.find({ parent: currentId }, "_id");
        children.forEach((child) => queue.push(child._id));
      }
    };

    await updateChildrenStatus(categoryId);
    await invalidateCategoryCache();
    console.log(
      `Category and its subcategories have been ${
        isActive ? "activated" : "deactivated"
      }.`,
    );
    return res.status(200).json({
      message: `Category and its subcategories have been ${
        isActive ? "activated" : "deactivated"
      }.`,
    });
  } catch (error) {
    console.error("Error toggling category:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

//CHECK ACTIVe PRODUCTS IN CATEGORY
const checkActiveProductsInCategory = async (req, res) => {
  const { id } = req.query;

  try {
    const activeProductCount = await Product.countDocuments({
      category: id,
      isActive: true,
    });

    res.status(200).json({ hasActiveProducts: activeProductCount > 0 });
  } catch (err) {
    console.error("Error checking active products", err);
    res.status(500).json({ message: "Server error" });
  }
};
module.exports = {
  toggleCategoryStatus,
  checkActiveProductsInCategory,
  getCategoryTree,
  // getCategoryById,
  getBreadcrumbs,
  createCategoryController,
  getAllCategories,
  updateCategory,
  deleteCategory,
  checkSlugAvailability,
  checkCodeAvailability,
  deleteCategory,
};
