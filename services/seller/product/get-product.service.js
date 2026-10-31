const mongoose = require("mongoose");
const Product = require("../../../models/Product.model");
const {AppError} = require("../../../utils/AppError");

const getSellerProductService = async (productId, seller) => {
  if (!seller) {
    throw new AppError("Seller not found", 404, "SELLER_NOT_FOUND");
  }

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new AppError("Invalid product id", 400, "INVALID_PRODUCT_ID");
  }

  const product = await Product.findById(productId)
    .select(
      "_id name description priceMinor stock category subCategory images seller",
    )
    .populate({ path: "category", select: "name" })
    .lean();

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

  return product;
};

module.exports = getSellerProductService;
