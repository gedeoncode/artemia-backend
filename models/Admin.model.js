const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // =====================================
    // 🔹 Admin Access Control
    // =====================================

    level: {
      type: String,
      enum: [
        "moderator",
        "support",
        "product_manager",
        "finance",
        "operations",
        "super_admin",
      ],
      default: "moderator",
    },

    permissions: [
      {
        type: String,
        enum: [
          "manage_users",
          "manage_products",
          "manage_orders",
          "manage_sellers",
          "manage_payments",
          "manage_categories",
          "manage_admins",
          "view_reports",
          "refund_orders",
          "review_products",
        ],
      },
    ],

    // =====================================
    // 🔹 Internal Admin Metadata
    // =====================================

    employeeId: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },

    department: {
      type: String,
      trim: true,
    },

    jobTitle: {
      type: String,
      trim: true,
    },

    notes: {
      type: String,
    },

    // =====================================
    // 🔹 Security
    // =====================================

    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },

    lastAdminLoginAt: Date,

    // =====================================
    // 🔹 Audit
    // =====================================

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    isSuspended: {
      type: Boolean,
      default: false,
    },

    suspendedAt: Date,
  },
  {
    timestamps: true,
  },
);

adminSchema.index({ level: 1 });

module.exports =
  mongoose.models.Admin ||
  mongoose.model("Admin", adminSchema);