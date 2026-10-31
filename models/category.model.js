const mongoose = require("mongoose");
const slugify = require("slugify");
const ruleConfig = require("../constants/homepageRules");
const {
  CATEGORY_NATURES,
  CATEGORY_STATUS,
  CATEGORY_ATTRIBUTES_INPUT_TYPE,
} = require("../constants/category.constants");

// ----------------- Sub-Schemas -----------------

const AttributeOptionSchema = new mongoose.Schema(
  {
    value: {
      type: String,
      required: true,
      trim: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false },
);

const categoryAttributeSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
    },

    label: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      required: true,
      enum: ["string", "number", "boolean", "date", "enum", "array", "object"],
    },

    inputType: {
      type: String,
      required: true,
      enum: CATEGORY_ATTRIBUTES_INPUT_TYPE,
    },

    required: {
      type: Boolean,
      default: false,
    },

    searchable: {
      type: Boolean,
      default: false,
    },

    filterable: {
      type: Boolean,
      default: false,
    },

    sortable: {
      type: Boolean,
      default: false,
    },

    options: {
      type: [AttributeOptionSchema],
      default: [], // field omitted when not provided
    },

    placeholder: String,

    helpText: String,

    defaultValue: mongoose.Schema.Types.Mixed,

    validation: {
      min: Number,
      max: Number,
      minLength: Number,
      maxLength: Number,
      regex: String,
    },

    ui: {
      order: {
        type: Number,
        default: 0,
      },

      width: {
        type: String,
        enum: ["full", "half", "third"],
        default: "full",
      },

      group: String,
    },
  },
  { _id: false },
);
const modeRulesSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: true,
    },

    commissionRate: {
      type: Number,
      default: 0,
    },

    minFee: {
      type: Number,
      default: 0,
    },

    maxFee: {
      type: Number,
      default: 0,
    },

    holdPeriod: {
      type: Number,
      default: 0,
    },
  },
  { _id: false },
);
// ----------------- Homepage Rules Schema -----------------

const homepageSectionSchema = new mongoose.Schema(
  {
    ruleType: {
      type: String,
      required: true,
      enum: Object.keys(ruleConfig),
    },

    title: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },

    limit: {
      type: Number,
      default: 10,
      min: 1,
      max: 100,
    },

    link: {
      type: String,
      trim: true,
      default: "",
    },

    order: {
      type: Number,
      default: 0,
    },
  },
  { _id: false },
);

const homepageSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: true,
    },

    hero: {
      enabled: {
        type: Boolean,
        default: false,
      },

      order: {
        type: Number,
        default: 0,
      },
    },

    sections: {
      type: [homepageSectionSchema],
      default: [],
    },
  },
  { _id: false },
);

// ----------------- Category Schema -----------------

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      maxlength: [100, "Category name cannot exceed 100 characters"],
      trim: true,
    },
    code: {
      type: String,
      unique: true,
      sparse: true,
      uppercase: true,
      trim: true,
      maxlength: 20,
    },

    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },

    requiresPayment: { type: Boolean, default: false },
    allowedModes: {
      type: [String],
      enum: ["PAP", "PAL"],
      default: ["PAL"],
    },

    // Make modeRules explicit so we can index/search within them if required
    modeRules: {
      PAL: { type: modeRulesSchema, default: () => ({}) },
      PAP: { type: modeRulesSchema, default: () => ({}) },
    },
    homepage: homepageSchema,
    publishing: {
      enabled: {
        type: Boolean,
        default: true,
      },

      requiresApproval: {
        type: Boolean,
        default: false,
      },
    },

    listingRequirements: {
      minImages: {
        type: Number,
        default: 1,
      },

      maxImages: {
        type: Number,
        default: 10,
      },
    },
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false, select: false },

    nature: {
      type: String,
      enum: CATEGORY_NATURES,
      default: "product",
    },
    status: {
      type: String,
      enum: CATEGORY_STATUS,
      default: "active",
    },

    description: {
      type: String,
      default: "",
      maxlength: [500, "Description cannot exceed 500 characters"],
    },

    image: {
      type: String,
      default: "",
    },

    slug: { type: String, lowercase: true, trim: true },

    attributes: { type: [categoryAttributeSchema], default: [] },
    tags: {
      type: [String],
      default: [],
    },
    level: { type: Number, default: 1, min: 1, max: 5 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, getters: true },
    toObject: { virtuals: true, getters: true },
    optimisticConcurrency: true, // use versionKey for optimistic locking
    versionKey: "version",
  },
);

// ----------------- Indexes -----------------
categorySchema.index({ name: 1 }, { collation: { locale: "en", strength: 2 } });
categorySchema.index({ isActive: 1, isFeatured: 1, isDeleted: 1 });
categorySchema.index(
  { slug: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } },
);
categorySchema.index({ parent: 1 });
categorySchema.index({ nature: 1 });
categorySchema.index({ level: 1 });
categorySchema.index({ name: "text", description: "text" });
categorySchema.index({ code: 1 }, { sparse: true });
categorySchema.index(
  {
    isActive: 1,
    status: 1,
    isDeleted: 1,
    "publishing.enabled": 1,
    "homepage.order": 1,
    isFeatured: -1,
    name: 1,
  },
  {
    partialFilterExpression: {
      "homepage.enabled": true,
    },
  }
);

categorySchema.virtual("parentCategory", {
  ref: "Category",
  localField: "parent",
  foreignField: "_id",
  justOne: true,
});

// ----------------- Static Helpers / Service Methods -----------------

/**
 * Soft-delete a category. Optionally cascade to children.
 */
categorySchema.statics.softDelete = async function (
  id,
  { cascade = false } = {},
) {
  const Model = this;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const doc = await Model.findById(id).session(session);
    if (!doc) throw new Error("Category not found");

    doc.isDeleted = true;
    doc.isActive = false;
    await doc.save({ session });

    if (cascade) {
      // mark direct children (and their descendants) as deleted via BFS to avoid recursion depth issues
      const queue = [doc._id];
      while (queue.length) {
        const parentId = queue.shift();
        const children = await Model.find({ parent: parentId }).session(
          session,
        );
        for (const child of children) {
          child.isDeleted = true;
          child.isActive = false;
          await child.save({ session });
          queue.push(child._id);
        }
      }
    }

    await session.commitTransaction();
    session.endSession();
    return true;
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
};

// ----------------- Export -----------------
module.exports =
  mongoose.models.Category || mongoose.model("Category", categorySchema);
