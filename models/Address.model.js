const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    province: {
      type: String,
    },

    city: {
      type: String,
    },

    commune: {
      type: String,
    },

    neighborhood: {
      type: String,
      required: true,
    },

    street: {
      type: String,
    },

    houseNumber: {
      type: String,
    },

    landmark: {
      type: String,
    },

    deliveryInstructions: {
      type: String,
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: [Number], // [lng, lat]
    },

    deliveryMethod: {
      type: String,
      enum: ["express", "hub"],
      default: "express",
    },

    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);
addressSchema.index({
  client:1
})
module.exports =
  mongoose.models.Address || mongoose.model("Address", addressSchema);
