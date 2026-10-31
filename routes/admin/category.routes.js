const express = require("express");
const router = express.Router();
const {
  createCategoryController,
  getAllCategories,
  checkSlugAvailability,
  getCategoryTree,
  toggleCategoryStatus,
  checkActiveProductsInCategory,
  updateCategory,
  deleteCategory,
  checkCodeAvailability,
} = require("../../controllers/admin/category.admin.controller");
const protect = require("../../middlewares/protect");
const { requireAdmin } = require("../../middlewares/admin.middleware");

// router.use(auth, isAdmin);

// Utility / non-ID-specific routes (must come first)
router.use(
  protect(["admin"]),
  requireAdmin
);
router.get("/check-slug", checkSlugAvailability);
router.get("/check-code", checkCodeAvailability);
router.get("/", getAllCategories);
router.post("/", createCategoryController);

// Routes with :id or :categoryId (must come after)
router.get("/:id/has-active-products", checkActiveProductsInCategory);
router.patch("/:id/toggle-status", toggleCategoryStatus);
router.put("/:id", updateCategory);
router.delete("/:id", deleteCategory);
router.get("/:id", getCategoryTree);

module.exports = router;
