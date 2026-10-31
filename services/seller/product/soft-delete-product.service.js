const mongoose = require("mongoose");
const Product = require("../../../models/Product.model");
const {AppError} = require("../../../utils/AppError");

const softDeleteProductService = async (productId, seller) => {
  if (!seller) {
    throw new AppError("Seller not found", 404, "SELLER_NOT_FOUND");
  }

  if (!productId) {
    throw new AppError("Product ID is required", 400, "PRODUCT_ID_REQUIRED");
  }

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new AppError("Invalid product id", 400, "INVALID_PRODUCT_ID");
  }

  // Fetch minimal fields only
  const product = await Product.findById(productId)
    .select("_id seller isDeleted")
    .lean();

  if (!product) {
    throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");
  }

  if (product.isDeleted) {
    throw new AppError(
      "Product already deleted",
      400,
      "PRODUCT_ALREADY_DELETED",
    );
  }

  if (product.seller.toString() !== seller.id.toString()) {
    throw new AppError(
      "Unauthorized access",
      403,
      "UNAUTHORIZED_PRODUCT_ACCESS",
    );
  }

  // Atomic update
  await Product.updateOne({ _id: productId }, { $set: { isDeleted: true } });

  return { success: true };
};

module.exports = softDeleteProductService;
