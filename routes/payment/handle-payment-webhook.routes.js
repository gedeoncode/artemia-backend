// routes/payment.routes.js
const express = require("express");
const { handlePaymentWebhookController } = require("../../controllers/payment");

const router = express.Router();

// Providers send POST requests to this route
router.post(
  "/payments/:provider",
  express.raw({ type: "*/*" }),
  handlePaymentWebhookController,
);
module.exports = router;
