const bulkProductActionService = require("./bulk-product-action.service");
const createProductService = require("./create-product.service");
const deleteProductImageService = require("./delete-product-image.service");
const deleteProductService = require("./delete-product.service");
const getSellerProductService = require("./get-product.service");
const getSellerProductsService = require("./get-products.service");
const markProductAsPaidService = require("./mark-product-as-paid.service");
const softDeleteProductService = require("./soft-delete-product.service");
const updateProductService = require("./update-product.service");
const uploadProductImagesService = require("./upload-product-images.service");

module.exports = {
  bulkProductActionService,
  createProductService,
  deleteProductImageService,
  deleteProductService,
  getSellerProductService,
  getSellerProductsService,
  markProductAsPaidService,
  softDeleteProductService,
  updateProductService,
  uploadProductImagesService,
};