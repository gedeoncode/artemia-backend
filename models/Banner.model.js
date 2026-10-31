const mongoose = require("mongoose");

const BannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 250,
    },

    images: {
      desktop: {
        type: String,
        required: true,
        trim: true,
        match: /^https?:\/\/.+/,
      },

      mobile: {
        type: String,
        trim: true,
        match: /^https?:\/\/.+/,
      },
    },

    alt: {
      type: String,
      default: "",
      trim: true,
      maxlength: 120,
    },

    cta: {
      text: {
        type: String,
        trim: true,
        maxlength: 30,
      },
      type: {
        type: String,
      },

      url: {
        type: String,
        trim: true,
      },

      openInNewTab: {
        type: Boolean,
        default: false,
      },
    },

    placement: {
      type: String,
      enum: ["hero", "home_top", "home_middle", "hero_side", "category"],
      default: "hero",
      index: true,
    },

    sortOrder: {
      type: Number,
      default: 0,
      min: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    startsAt: {
      type: Date,
    },

    endsAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

BannerSchema.pre("save", function (next) {
  if (this.startsAt && this.endsAt && this.startsAt > this.endsAt) {
    return next(new Error("startsAt must be earlier than endsAt."));
  }

  next();
});

BannerSchema.index({
  placement: 1,
  isActive: 1,
  sortOrder: 1,
});

module.exports =
  mongoose.models.Banner || mongoose.model("Banner", BannerSchema);
