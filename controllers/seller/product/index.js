const bulkProductActionController = require("./bulk-product-action.controller");
const createProductController = require("./create-product.controller");
const deleteProductImageController = require("./delete-product-image.controller");
const deleteProductController = require("./delete-product.controller");
const getSellerProductController = require("./get-product.controller");
const getSellerProductsController = require("./get-products.controller");
const markProductAsPaidController = require("./mark-product-as-paid.controller");
const softDeleteProductController = require("./soft-delete-product.controller");
const updateProductController = require("./update-product.controller");
const uploadProductImagesController = require("./upload-product-images.controller");

module.exports = {
  bulkProductActionController,
  createProductController,
  deleteProductImageController,
  deleteProductController,
  getSellerProductController,
  getSellerProductsController,
  markProductAsPaidController,
  softDeleteProductController,
  updateProductController,
  uploadProductImagesController,
};
