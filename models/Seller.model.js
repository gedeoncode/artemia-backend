const mongoose = require("mongoose");
const { enumValues } = require("../utils/enumFunction");
const {
  SELLER_TIER,
  SELLER_VERIFICATION_STATUS,
} = require("../constants/seller.constants");

const sellerSchema = new mongoose.Schema(
  {
    // === Ownership ===
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // === Seller identity ===
    sellerType: {
      type: String,
      enum: ["individual", "company"],
      default: "individual",
    },

    businessName: {
      type: String,
      trim: true,
      required: function () {
        return this.sellerType === "company";
      },
    },
    identity: {
      dob: {
        type: Date,
        // required: true,
      },

      nationality: {
        type: String,
        trim: true,
        uppercase: true,
        minlength: 2,
        maxlength: 2, // ISO country code
        default: "CD",
      },

      gender: {
        type: String,
        enum: ["MALE", "FEMALE", "OTHER"],
      },

      idDocument: {
        type: {
          type: String,
          enum: ["NATIONAL_ID", "PASSPORT", "VOTER_CARD"],
          // required: true,
          default: "NATIONAL_ID",
        },
        number: {
          type: String,
          trim: true,
          // required: true,
        },
        issuedAt: Date,
        expiresAt: Date,
      },
    },

    // === Commercial setup ===
    commissionModel: {
      type: String,
      enum: ["PAL", "PAP"],
      default: "PAP",
    },

    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],

    // === Operating address (embedded, seller-owned) ===
    operatingAddress: {
      province: { type: String, default: "" },
      city: { type: String, default: "" },
      commune: { type: String, default: "" },
      neighborhood: { type: String, default: "" },
      avenue: { type: String, default: "" },
      houseOrShop: { type: String, default: "" },
      streetOrLandmark: { type: String, default: "", minLength: 0 },
      notes: String,
    },

    // === Seller lifecycle / status ===
    status: {
      type: String,
      enum: ["ONBOARDING", "ACTIVE", "SUSPENDED", "REJECTED"],
      default: "ONBOARDING",
    },

    isBlocked: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },

    // === Verification & documents ===
    verificationStatus: {
      type: String,
      enum: enumValues(SELLER_VERIFICATION_STATUS),
      default: SELLER_VERIFICATION_STATUS.UNDER_REVIEW, // This will be shifted to pending
    },

    documents: [{ type: mongoose.Schema.Types.ObjectId, ref: "Document" }],
    // === Onboarding ===
    onboarding: {
      step: {
        type: String,
        enum: [
          "ADDRESS",
          "IDENTITY",
          "UPLOADDOCUMENTS",
          "MODE",
          "CONFIRMATION",
          "COMPLETED",
        ],
        default: "ADDRESS",
      },
      completedSteps: { type: [String], default: [] },
      draft: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: {},
      },
      status: {
        type: String,
        enum: ["pending", "in_progress", "completed"],
        default: "pending",
      },

      timestamps: {
        startedAt: Date,
        documentsSubmittedAt: Date,
        approvedAt: Date,
        rejectedAt: Date,
        completedAt: Date,
      },
      completed: { type: Boolean, default: false },
    },
    // === Listing moderation ===
    sellerTier: {
      type: String,
      enum: enumValues(SELLER_TIER),
      default: SELLER_TIER.NEW,
    
    },

    // === Metrics / activity ===
    totalSales: Number,
    activatedAt: Date,
    suspendedAt: Date,
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  },
);

// === Indexes ===
sellerSchema.index({ verificationStatus: 1 });
sellerSchema.index({ status: 1 });
sellerSchema.index({ "onboarding.completed": 1 });
sellerSchema.index(
  { user: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);

// Virtuals
sellerSchema.virtual("isActive").get(function () {
  return (
    this.onboarding.completed === true &&
    this.verificationStatus === "approved" &&
    this.isBlocked === false &&
    this.isDeleted === false
  );
});

sellerSchema.virtual("id").get(function () {
  return this._id.toHexString();
});
// === Cascade Deletes ===
sellerSchema.pre("remove", async function (next) {
  try {
    // Delete all products owned by seller
    await mongoose.model("Product").deleteMany({ seller: this._id });
    // Delete all documents owned by seller
    await mongoose.model("Document").deleteMany({ seller: this._id });
    // Optionally: unlink from categories if needed
    await mongoose
      .model("Category")
      .updateMany({ sellers: this._id }, { $pull: { sellers: this._id } });
    next();
  } catch (err) {
    next(err);
  }
});
// Add to sellerSchema.methods
sellerSchema.methods.softDelete = async function () {
  try {
    // 1️⃣ Soft delete seller
    this.isDeleted = true;
    this.verificationStatus = "rejected";
    await this.save({ validateBeforeSave: false });

    // 2️⃣ Soft delete products
    await mongoose
      .model("Product")
      .updateMany({ seller: this._id }, { isDeleted: true, status: "deleted" });

    // 3️⃣ Soft delete documents
    await mongoose
      .model("Document")
      .updateMany({ seller: this._id }, { isDeleted: true });

    // 4️⃣ Optionally unlink from categories
    await mongoose
      .model("Category")
      .updateMany({ sellers: this._id }, { $pull: { sellers: this._id } });
  } catch (err) {
    console.error("❌ Soft delete failed:", err);
    throw err;
  }
};
module.exports =
  mongoose.models.Seller || mongoose.model("Seller", sellerSchema);
