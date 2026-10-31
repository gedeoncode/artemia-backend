// models/ProductReview.js

const mongoose = require("mongoose");

const { Schema } = mongoose;

const productReviewSchema = new Schema(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    comment: {
      type: String,
      trim: true,
      maxlength: 2000,
    },

    isVerifiedPurchase: {
      type: Boolean,
      default: false,
    },

    /**
     * Enterprise moderation pipeline
     */
    isApproved: {
      type: Boolean,
      default: true,
      index: true,
    },

    moderatedAt: {
      type: Date,
    },

    moderatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

/**
 * Prevent duplicate reviews
 * One user → one review per product
 */
productReviewSchema.index(
  { product: 1, user: 1 },
  { unique: true }
);
/**
 * Fast product review queries
 */
productReviewSchema.index({
  product: 1,
  createdAt: -1,
});

module.exports =
  mongoose.models.ProductReview ||
  mongoose.model("ProductReview", productReviewSchema);