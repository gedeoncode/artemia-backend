const express = require('express');
const orderController = require('../../controllers/admin/order.admin.controller');
// const auth = require('../../middlewares/auth');
// const isAdmin = require('../../middlewares/isAdmin');

const router = express.Router();
// router.use(auth, isAdmin);
router.get("/", orderController.getAllOrders);
router.get('/:id', orderController.getOrderDetails);
router.patch("/:id/status", orderController.updateOrderStatus);
module.exports = router;
