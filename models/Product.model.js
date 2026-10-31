const mongoose = require("mongoose");
const {
  PRODUCT_REJECT_REASONS,
  PRODUCT_PUBLICATION_STATUS,
  BILLING_STATUS,
  DEAL_SOURCE,
  CURRENCY_CODE,
} = require("../constants/product.constants");
const { HANDLED_BY } = require("../constants/order.constants");
const { enumValues } = require("../utils/enumFunction");

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    thumbnailUrl: { type: String, required: true },
    publicId: { type: String, required: true },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: false },
);

const productSchema = new mongoose.Schema(
  {
    clientRequestId: {
      type: String,

      sparse: true,

      unique: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String },
    shortDescription: { type: String },
    // 🔸 Pricing
    // =========================================================
    pricing: {
      // Base/original product price
      originalPriceMinor: {
        type: Number,
        required: true,
        min: 0,
      },

      // Current active selling price
      currentPriceMinor: {
        type: Number,
        required: true,
        min: 0,
      },

      // Optional marketplace discount
      discountPriceMinor: {
        type: Number,
        default: 0,
        min: 0,
      },

      // Marketplace listing fee, this will live under billing
      listingFeeMinor: {
        type: Number,
        default: 0,
        min: 0,
      },

      currencyCode: {
        type: String,
        enum: enumValues(CURRENCY_CODE),
        default: CURRENCY_CODE.USD,
        uppercase: true,
        trim: true,
      },
      type: {
        type: String,
        enum: ["fixed", "negotiable", "range", "free"],
      },

      unit: {
        type: String,
        enum: ["item", "month", "day", "service", "license"],
      },

      // =====================================================
      // 🔸 Deal / Promotion
      // =====================================================
      deal: {
        isActive: {
          type: Boolean,
          default: false,
        },

        type: {
          type: String,
          enum: ["fixed_price", "percentage", "clearance", "flash_sale"],
          default: "fixed_price",
        },

        source: {
          type: String,

          enum: enumValues(DEAL_SOURCE),

          default: DEAL_SOURCE.SELLER,
        },
        label: {
          type: String,
          trim: true,
        },

        priority: {
          type: Number,
          default: 0,
        },

        priceMinor: {
          type: Number,
          min: 0,
        },

        percentage: {
          type: Number,
          min: 0,
          max: 100,
        },

        start: {
          type: Date,
        },

        expiry: {
          type: Date,

          validate: {
            validator(value) {
              if (!value || !this.pricing?.deal?.start) {
                return true;
              }

              return value > this.pricing.deal.start;
            },

            message: "Deal expiry must be after deal start date",
          },
        },

        status: {
          type: String,
          enum: ["scheduled", "active", "expired", "paused"],
          default: "scheduled",
        },
      },
    },

    // 🔸 Media
    images: { type: [imageSchema], default: [] },

    // 🔸 Category Info
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    // 🔸 Seller Info
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seller",
      required: true,
    },
    // 🔸 Inventory & Stats
    stock: { type: Number, default: 0 },
    sales: { type: Number, default: 0 },
    commissionModel: {
      type: String,
      enum: ["PAP", "PAL"],
      default: "PAL",
    },
    handledBy: {
      type: String,
      enum: HANDLED_BY,
      required: true,
      default: "seller",
    },

    // 🔸 Category-specific details
    details: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // 🔸 Dimensions
    shipping: {
      weight: { type: Number, default: 0 },
      dimensions: {
        length: { type: Number, default: 0 },
        width: { type: Number, default: 0 },
        height: { type: Number, default: 0 },
        unit: { type: String, enum: ["cm", "m", "in", "ft"], default: "cm" },
      },
      handoverMethod: {
        type: String,
        enum: ["pickup", "dropoff"],
        default: "pickup",
      },
      location: {
        country: { type: String, default: "RDC" },

        province: String,
        city: String,
        commune: String,
        quartier: String,
        avenue: String,

        geo: {
          lat: Number,
          lng: Number,
        },
      },
      dropoffHub: { type: String },
      customDropoffNote: { type: String },

      deliveryMethod: {
        type: String,
        enum: ["own_delivery", "pickup", "courier"],
      }, // PAP mode
      estimatedTime: { type: String }, // PAP mode estimated time
      countryOfOrigin: { type: String },
    },

    // 🔸 Stock Handling
    quantity: { type: Number, default: 1 }, // product quantity per order
    trackQuantity: { type: Boolean, default: true },
    continueSellingWhenOutOfStock: { type: Boolean, default: false },

    // 🔸 Product Type
    taxStatus: {
      type: String,
      enum: ["taxable", "shipping", "none"],
      default: "taxable",
    },

    // 🔸 Flags
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    isFeatured: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: false },

    // 🔸 Status
    publication: {
      status: {
        type: String,
        enum: enumValues(PRODUCT_PUBLICATION_STATUS),
        default: "draft",
      },
      createdAt: Date,
      reviewedAt: Date,
      publishedAt: Date,
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },

      rejectionReason: {
        type: String,
        trim: true,
        maxlength: 1000,
      },

      rejectionCode: {
        type: String,
        enum: enumValues(PRODUCT_REJECT_REASONS),
      },

      internalNote: {
        type: String,
      },
    },

    billingStatus: {
      type: String,
      enum: enumValues(BILLING_STATUS),
      default: "unpaid",
    },

    inventoryStatus: {
      type: String,
      enum: ["in_stock", "low_stock", "out_of_stock", "preorder"],
      default: "in_stock",
    },
    // 🔸 Schema Version
    schemaVersion: { type: Number, default: 1 },
  },
  {
    timestamps: true,
  },
);

// ====================
// 🔹 Indexes
// ====================
productSchema.index(
  {
    seller: 1,
    clientRequestId: 1,
  },

  {
    unique: true,
    sparse: true,
  },
);
productSchema.index({
  category: 1,
  "pricing.currentPriceMinor": 1,
});

productSchema.index({
  seller: 1,
  category: 1,
  "publication.status": 1,
});

productSchema.index({
  isFeatured: 1,
  "publication.status": 1,
});

productSchema.index({
  name: "text",
  description: "text",
});
module.exports =
  mongoose.models.Poduct || mongoose.model("Product", productSchema);
