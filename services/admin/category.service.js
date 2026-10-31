const mongoose = require("mongoose");
const slugify = require("slugify");
const Category = require("../../models/category.model");

async function createCategory(data) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      name,
      code,
      description,
      parent,
      image,
      nature,
      requiresPayment,
      isFeatured,
      publishing,
      listingRequirements,
      status,
      slug,
      attributes,
      allowedModes,
      modeRules,
      homepageRules,
      tags
    } = data;

    // 🔍 Case-insensitive duplicate check with collation (better than regex)
    const existingCategory = await Category.findOne({ name })
      .collation({ locale: "en", strength: 2 })
      .lean()
      .session(session);

    if (existingCategory) {
      const err = new Error("Category with this name already exists");
      err.statusCode = 409; // Conflict
      throw err;
    }

    // 🔍 Validate parent if provided
    if (parent) {
      const parentCategory = await Category.findOne({
        _id: parent,
        isActive: true,
      })
        .lean()
        .session(session);

      if (!parentCategory) {
        const err = new Error("Parent category not found or inactive");
        err.statusCode = 404;
        throw err;
      }
    }

    // 🏗️ Create category (slug auto-regenerates in pre-save if name changes)
    const category = new Category({
      name,
      code,
      description,
      parent: parent || null,
      image,
      nature,
      requiresPayment,
      isFeatured,
      publishing,
      listingRequirements,
      status,
      slug: slug || slugify(name, { lower: true, strict: true }),
      attributes,
      allowedModes,
      modeRules,
      homepageRules,
      tags
    });

    await category.save({ session });

    // 🎯 Populate parent info
    const createdCategory = await Category.findById(category._id)
      .populate("parentCategory", "name slug")
      .lean()
      .session(session);

    // 🔄 Example: If you need to log/audit later, add here inside the same transaction
    // await AuditLog.create([{ action: "CATEGORY_CREATED", data: createdCategory }], { session });

    await session.commitTransaction();
    session.endSession();

    // 🔄 Cache invalidation (outside transaction, safe async hook)
    if (typeof global.invalidateCategoryCache === "function") {
      try {
        await global.invalidateCategoryCache();
      } catch (cacheErr) {
        console.error("Cache invalidation failed:", cacheErr);
      }
    }

    return createdCategory;
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}

module.exports = {
  createCategory,
};
