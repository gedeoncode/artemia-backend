const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const registrationSessionSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },

 
    signupIntent: {
      type: String,
      enum: ["BECOME_SELLER", "BROWSE"],
      default: null,
    },
    sellerStatus: {
      type: String,
      enum: ["NONE", "ONBOARDING", "ACTIVE", "SUSPENDED"],
      default: "NONE",
    },  
    // Step-by-step onboarding data
    personalInfo: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },

    sellerInfo: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // OTP
    otpCode: { type: String, select: false, default: null },
    otpExpires: { type: Date, select: false, default: null },
    otpAttempts: { type: Number, default: 0, select: false },
    lastOtpSent: { type: Date, default: null },

    // Optional password for temporary storage (hashed)
    password: { type: String, select: false },

    // Track registration step
    currentStep: {
      type: String,
      enum: [
        "EMAIL",
        "SIGNUP_INTENT",
        "PERSONAL_INFO",
        "OTP",
        "COMPLETED",
      ],
      default: "EMAIL",
    },

    // Mark session as completed
    isCompleted: { type: Boolean, default: false },

    // Optional metadata
    ipAddress: { type: String },
    userAgent: { type: String },

    // TTL expiration: session auto-deletes after 30 minutes
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 60 * 1000),
      index: { expires: 0 }, // TTL
    },
  },
  { timestamps: true }
);

//
// === Instance Methods ===

// Set OTP (hash + expiry)
registrationSessionSchema.methods.setOtp = function (otp, expiryMinutes = 30) {
  this.otpCode = crypto.createHash("sha256").update(otp).digest("hex");
  this.otpExpires = new Date(Date.now() + expiryMinutes * 60 * 1000);
  this.otpAttempts = 0;
  this.lastOtpSent = new Date();
};

// Verify OTP
registrationSessionSchema.methods.verifyOtp = function (enteredOtp) {
  if (!this.otpCode || !this.otpExpires) return false;
  if (Date.now() > this.otpExpires.getTime()) return false;

  const hashed = crypto.createHash("sha256").update(enteredOtp).digest("hex");
  return this.otpCode === hashed;
};

// Hash and store password temporarily
registrationSessionSchema.methods.setPassword = async function (plainPassword) {
  this.password = await bcrypt.hash(plainPassword, 12);
};

registrationSessionSchema.methods.matchPassword = async function (
  plainPassword
) {
  if (!this.password) return false;
  return await bcrypt.compare(plainPassword, this.password);
};

module.exports = mongoose.model(
  "RegistrationSession",
  registrationSessionSchema
);
