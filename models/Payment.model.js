const mongoose = require("mongoose");
const { PAYMENT_STATUS } = require("../constants/payment.constants");
const { enumValues } = require("../utils/enumFunction");

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seller",
      required: true,
    },

    amountMinor: {
      type: Number,
      required: true,
    },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    phone: String,
    currencyCode: {
      type: String,
      default: "USD",
    },
    status: {
      type: String,
      enum: enumValues(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
    },
    provider: {
      type: String,
      enum: ["stripe", "moneroo"],
      required: true,
    },
    providerSessionId: {
      type: String,
      // required: true, // e.g. Stripe checkoutSession.id
    },
    transactionId: { type: String, default: "" }, // i'll use this instead of providerSessionId
    providerSessionURL: String, // e.g. Stripe checkoutSession.url
    failureReason: String,
    completedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

paymentSchema.index({ userId: 1 });
paymentSchema.index({ productId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ provider: 1 });


module.exports =
  mongoose.models.Payment || mongoose.model("Payment", paymentSchema);

