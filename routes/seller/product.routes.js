const express = require("express");
const router = express.Router();

// Controllers
const {
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
} = require("../../controllers/seller/product");

// Middlewares
const protect = require("../../middlewares/protect");
const requireSeller = require("../../middlewares/requireSeller");
const { handleUpload } = require("../../middlewares/upload");
const { createRateLimiter } = require("../../middlewares/createRateLimiter");
const {idempotency} = require("../../middlewares/idempotency.middleware");
const { getPaymentSessionController } = require("../../controllers/seller");
const { UPLOAD_TYPES } = require("../../constants/upload.const");
const attachSellerBasedOnIntent = require("../../middlewares/attachSellerBasedOnIntent");

/**
 * Rate limiters
 */
const productImagesLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20,
  message:
    "Trop de tentatives de téléchargement d’images produit. Veuillez réessayer plus tard ou contacter le support.",
  skipSuccessfulRequests: true,
});

/**
 * Shared middleware stack for seller routes
 */
const sellerGuard = [protect(), attachSellerBasedOnIntent, requireSeller];

/**
 * IMAGE UPLOAD
 * (must stay before dynamic routes)
 */
router.post(
  "/upload-images",
  // sellerGuard,
  productImagesLimiter,
  handleUpload({
    type: UPLOAD_TYPES.ARRAY,
    folder: "products",
    maxFiles: 5,
    config: "images",
  }),
  uploadProductImagesController,
);


/**
 * PRODUCT CREATION & LISTING
 */

// POST /add
router.post("/add", sellerGuard, idempotency, createProductController);

// GET /products
router.get("/", sellerGuard, getSellerProductsController);

/**
 * BULK ACTIONS
 */

// PATCH /products/bulk
router.patch("/bulk", sellerGuard, bulkProductActionController);

/**
 * PRODUCT IMAGES
 */

// DELETE /product/image/delete-image
router.delete("/image/delete-image", sellerGuard, deleteProductImageController);

/**
 * PRODUCT UPDATE & DELETE
 */

// PUT /update-product/:productId
router.put("/update/:productId", sellerGuard, updateProductController);

// PATCH /product/soft-delete/:productId
router.patch(
  "/soft-delete/:productId",
  sellerGuard,
  softDeleteProductController,
);

// DELETE /product/:productId
router.delete("/:productId", sellerGuard, deleteProductController);

/**
 * PRODUCT PAYMENT
 */

// PATCH /product/mark-as-paid/:productId
router.patch(
  "/product/mark-as-paid/:productId",
  sellerGuard,
  markProductAsPaidController,
);

// GET /product/payment-session/:sessionId
router.get(
  "/payment-session/:sessionId",
  sellerGuard,
  getPaymentSessionController,
);

/**
 * SINGLE PRODUCT
 * (keep at the end)
 */

// GET /product/:productId
router.get("/:productId", sellerGuard, getSellerProductController);

module.exports = router;
