const mongoose = require("mongoose");
const Product = require("../../../models/Product.model");
const {AppError} = require("../../../utils/AppError");

const markProductAsPaidService = async (
  productId,
  seller,
  paymentData = {},
) => {
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
  // Update payment fields
  // -------------------------

  product.isPaid = true;
  product.paidAt = new Date();
  product.paymentMethod = paymentData.paymentMethod || "unknown";
  product.transactionId = paymentData.transactionId || "N/A";
  product.paymentDetails = paymentData.paymentDetails || {};
  product.status = "activated"; // Activate upon payment

  await product.save();

  return product;
};

module.exports = markProductAsPaidService;
