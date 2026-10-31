
const mongoose = require("mongoose");
const fs = require("fs").promises;
const path = require("path");
const Product = require("../../../models/Product.model");
const {AppError} = require("../../../utils/AppError");

const deleteProductService = async (productId, seller) => {
  if (!seller) {
    throw new AppError("Seller not found", 404, "SELLER_NOT_FOUND");
  }

  if (!productId) {
    throw new AppError("Product ID is required", 400, "PRODUCT_ID_REQUIRED");
  }

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new AppError("Invalid product id", 400, "INVALID_PRODUCT_ID");
  }

  const product = await Product.findById(productId);

  if (!product) {
    throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");
  }

  if (product.seller.toString() !== seller.id.toString()) {
    throw new AppError(
      "Unauthorized access",
      403,
      "UNAUTHORIZED_PRODUCT_ACCESS",
    );
  }

  // -------------------------
  // 1️⃣ Delete Associated Images (Non-blocking safe)
  // -------------------------

  if (Array.isArray(product.images)) {
    for (const img of product.images) {
      try {
        const imgPath = typeof img === "string" ? img : img.url || img.path;

        if (!imgPath) continue;

        const fullPath = path.join(process.cwd(), imgPath);

        await fs.unlink(fullPath).catch(() => {});
      } catch (err) {
        console.warn("Image delete failed:", err.message);
      }
    }
  }

  // -------------------------
  // 2️⃣ Delete Product (Hard Delete)
  // -------------------------

  await product.deleteOne();

  return { success: true };
};

module.exports = deleteProductService;
