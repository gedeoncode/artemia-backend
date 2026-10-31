const express = require("express");
const protect = require("../../middlewares/protect");
const attachSeller = require("../../middlewares/attachSeller");
const requireSeller = require("../../middlewares/requireSeller");
const router = express.Router();

/**
 * Shared middleware stack for seller routes
 */
const sellerGuard = [protect(["seller"]), attachSeller, requireSeller];

// Apply to all routes below
router.use(sellerGuard);

router.get(
  "/",

  require("../../controllers/seller/order.controller").getSellerOrders
);

router.get(
  "/stats",

  require("../../controllers/seller/order.controller").getSellerOrderStats
);

router.get(
  "/:id",
  require("../../controllers/seller/order.controller").getOrder
);
router.put(
  "/:id/status",
  require("../../controllers/seller/order.controller").updateSellerOrderStatus
);

module.exports = router;
