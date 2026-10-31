const mongoose = require("mongoose");
const Product = require("../../models/Product.model");
const { pricingSnapshot } = require("../../helpers/pricing.helper");
const { AppError } = require("../../utils/AppError");

const getCheckoutProduct = async (productId) => {
  if (!mongoose.isValidObjectId(productId)) {
    throw new AppError("Invalid product id.", 400, "INVALID_PRODUCT_ID");
  }

  const product = await Product.findOne({
    _id: productId,
    isDeleted: false,
  })
    .select("_id name images pricing stock continueSellingWhenOutOfStock")
    .lean();

  if (!product) {
    throw new AppError("Product not found.", 404, "PRODUCT_NOT_FOUND");
  }

  product.pricing = pricingSnapshot(product);

  product.isPurchasable =
    product.stock > 0 || product.continueSellingWhenOutOfStock;

  if (!product.isPurchasable) {
    throw new AppError("Product is unavailable.", 400, "PRODUCT_UNAVAILABLE");
  }

  return {
    _id: product._id,
    name: product.name,
    images: product.images,
    stock: product.stock,

    effectivePriceMinor: product.pricing.effectivePriceMinor / 100,

    pricing: {
      price: product.pricing.effectivePriceMinor / 100,
      currency: product.pricing.currencyCode,
    },
  };
};
module.exports = {
  getCheckoutProduct,
};
