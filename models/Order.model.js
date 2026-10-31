const mongoose = require("mongoose");
const {
  ORDER_STATUS,
  ORDER_PAYMENT_STATUS,
  HANDLED_BY,
  PAYMENT_METHODS,
  CURRENCY,
} = require("../constants/order.constants");

const PaymentSchema = new mongoose.Schema(
  {
    method: {
      type: String,
      enum: PAYMENT_METHODS,
      default: "cash_on_delivery",
    },
    transactionId: { type: String, trim: true },
    status: {
      type: String,
      enum: ORDER_PAYMENT_STATUS,
      default: "unpaid",
    },
    paidAt: { type: Date },
  },
  { _id: false },
);
const OrderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
    },

    pricing: {
      currencyCode: String,

      originalPriceMinor: Number,

      effectivePriceMinor: Number,

      discountAmountMinor: Number,

      discountPercentage: Number,
    },
  },
  { _id: false },
);
const orderSchema = new mongoose.Schema(
  {
    handledBy: {
      type: String,
      enum: HANDLED_BY,
      required: true,
    },
    status: {
      type: String,
      enum: ORDER_STATUS,
      default: "pending",
    },
    products: [OrderItemSchema],
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seller",
    },
    deliveryAddress: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Address",
    },
    orderNumber: { type: String, unique: true, required: true },
    pricing: {
      itemsPriceMinor: { type: Number, required: true },
      totalPriceMinor: { type: Number, required: true },
    },
    payment: PaymentSchema,
    isDeleted: { type: Boolean, default: false },
    version: { type: Number, default: 1 },
    isReviewed: { type: Boolean, default: false },
    deliveryDate: Date,
  },
  { timestamps: true },
);


/** Indexing for query performance */
orderSchema.index({ client: 1, status: 1 });
orderSchema.index({ seller: 1, createdAt: -1 });
orderSchema.index({ "payment.status": 1 });
orderSchema.index({ isDeleted: 1 });
orderSchema.index({ status: 1 });

module.exports = mongoose.models.Order || mongoose.model("Order", orderSchema);
