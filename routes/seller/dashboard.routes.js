const express = require("express");
const router = express.Router();

// Controllers

const {
  getSellerDashboard,
  getSellerShell,
} = require("../../controllers/seller/dashboard/dashboard.controller");
const {
  getCategories,
} = require("../../controllers/seller/category.controller");

// Middlewares
const protect = require("../../middlewares/protect");
const { requireSeller } = require("../../middlewares/seller.middleware");

const sellerGuard = [protect(), requireSeller];

// GET /dashboard
router.get("/dashboard", sellerGuard, getSellerDashboard);
router.get("/shell", sellerGuard, getSellerShell);

// GET /categories
router.get("/categories", sellerGuard, getCategories);

module.exports = router;
