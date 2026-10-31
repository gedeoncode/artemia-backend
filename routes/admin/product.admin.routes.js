const express = require("express");
const productController = require("../../controllers/admin/product/product.admin.controller");
const { getProductSales } = require("../../controllers/admin/product/analytics.controller");
const { bulkProductAction } = require("../../controllers/admin/product/bulk.controller");
const { toggleProductFlag } = require("../../controllers/admin/product/moderation.controller");
const protect = require("../../middlewares/protect");
const { requireAdmin } = require("../../middlewares/admin.middleware");

const router = express.Router();

router.use(
  protect(["admin"]),
  requireAdmin
);
router.get("/", productController.getAllProducts);

router.get("/stats", getProductSales);

router.get("/:id", productController.getProductById);

router.get("/:productId/sales", getProductSales);

// =========================
// Bulk actions (now unified)
// =========================
router.patch("/bulk/:action", bulkProductAction);

// =========================
// Product flags (unified)
// =========================
router.patch("/:id/flags/:flag", toggleProductFlag);
module.exports = router;
