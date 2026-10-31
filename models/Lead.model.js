const mongoose = require("mongoose");
const { HANDLED_BY } = require("../constants/order.constants");
const {
  CONSTACT_METHOD,
  LEAD_STATUS,
  LEAD_SOURCES,
} = require("../constants/lead.constants");

const leadSchema = new mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seller",
      required: true,
      index: true,
    },

    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    handledBy: {
      type: String,
      enum: HANDLED_BY,
      required: true,
      default: "seller",
      index: true,
    },
    // How customer contacted seller
    contactMethod: {
      type: String,
      enum: CONSTACT_METHOD,
      required: true,
    },

    // Lead lifecycle
    status: {
      type: String,
      enum: LEAD_STATUS,
      default: "new",
      index: true,
    },

    // Optional notes seller can add later
    notes: {
      type: String,
      default: "",
    },

    // Seller-reported sale amount
    estimatedSaleAmount: {
      type: Number,
      default: 0,
    },

    // Useful analytics data
    source: {
      type: String,
      enum: LEAD_SOURCES,
      default: "product_page",
    },
    lastContactedAt: {
      type: Date,
      default: Date.now,
    },

    convertedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);
leadSchema.index({
  seller: 1,
  status: 1,
  createdAt: -1,
});

leadSchema.index({
  seller: 1,
  product: 1,
});
module.exports = mongoose.models.Lead || mongoose.model("Lead", leadSchema);
