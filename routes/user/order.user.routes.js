const express = require("express");
const {
  createOrder,
  getMyOrders,
  cancelOrder,
  getClientAddresses,
  getClientAddress,
  getOrderById,
} = require("../../controllers/user/order.user.controller");

const Order = require("../../models/Order.model");
const protect = require("../../middlewares/protect");
const { getCheckoutProductController } = require("../../controllers/user/checkout.controller");

const router = express.Router();

router.post("/",protect(), createOrder);
router.get("/",   getMyOrders);
router.get(
  "/addresses",
  protect(),
  getClientAddresses
);

router.get(
  "/address/:id",
  protect(),
  getClientAddress
);
router.get("/:id/checkout",   getCheckoutProductController);
router.put("/:id/cancel",  cancelOrder);
router.get("/:id",  getOrderById);

module.exports = router;
