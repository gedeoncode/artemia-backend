const express = require("express");
const router = express.Router();
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
} = require("../../controllers/seller/notification.controller");

const protect = require("../../middlewares/protect");
const attachSeller = require("../../middlewares/attachSeller");
const requireSeller = require("../../middlewares/requireSeller");

/**
 * Shared middleware stack for seller routes
 */
const sellerGuard = [protect(["seller"]), attachSeller, requireSeller];

// Apply to all routes below
router.use(sellerGuard);

router.get(
  "/",
  getNotifications
);
router.patch("/read-all", markAllAsRead);
router.patch(
  "/:notificationId/read",

  markAsRead
);

module.exports = router;
