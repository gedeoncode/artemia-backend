const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipients: [
      {
        userType: {
          type: String,
          enum: ["User", "Seller", "Admin"],
          required: true,
        },
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          refPath: "recipients.userType",
          required: true,
        },
        read: {
          type: Boolean,
          default: false,
        },
      },
    ],
    type: {
      type: String,
      enum: [
        "NEW_SELLER_SIGNUP",
        "NEW_ORDER",
        "ORDER_UPDATE",
        "ADMIN_ALERT",
        "SELLER_ALERT",
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    link: {
      type: String,
      default: "",
    },
    metadata: {
      type: Object,
      default: {},
    },
    relatedEntity: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
    relatedEntityType: {
      type: String,
      enum: ["Order", "Product", "User"],
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({
  "recipients.userId": 1,
  createdAt: -1,
});

module.exports =
  mongoose.models.Notification ||
  mongoose.model("Notification", notificationSchema);
