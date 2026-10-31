const express = require("express");
const router = express.Router();

// Controllers
const profileController = require("../../controllers/seller/profile.controller");

// Middlewares
const protect = require("../../middlewares/protect");
const attachSeller = require("../../middlewares/attachSeller");
const requireSeller = require("../../middlewares/requireSeller");
/**
 * Guards
 */
const sellerGuard = [protect(["seller"]), attachSeller, requireSeller];

/**
 * ==========================
 * SELLER BUSINESS ROUTES
 * ==========================
 */

router.use(sellerGuard);

// GET /seller/profile
router.get("/", profileController.getSellerProfile);

// PATCH /seller/profile
router.patch("/", profileController.updateSellerProfile);

// PATCH /seller/profile/change-selling-mode
router.patch("/change-selling-mode", profileController.updateSellingMode);


module.exports = router;
