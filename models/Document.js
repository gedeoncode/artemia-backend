const mongoose = require("mongoose");
const documentSchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seller",
      required: true,
    },
    profilePhoto: {
      url: { type: String, required: true },
      publicId: { type: String, required: true },
    },
    idFront: {
      url: { type: String, required: true },
      publicId: { type: String, required: true },
    },
    idBack: {
      url: { type: String, required: true },
      publicId: { type: String, required: true },
    },

    // Business-specific fields (only required for commerçant)
    businessLicense: {
      url: { type: String },
      publicId: { type: String },
    },
    vatCertificate: {
      url: { type: String },
      publicId: { type: String },
    },
    businessLogo: {
      url: { type: String },
      publicId: { type: String },
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    rejectionReason: {
      type: String,
      default: "",
    },
    verificationDate: {
      type: Date,
      default: null,
    },
    verificationBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);
documentSchema.index({ sellerId: 1 }, { unique: true });
documentSchema.index({ status: 1 }); 

module.exports =
  mongoose.models.Document || mongoose.model("Document", documentSchema);


