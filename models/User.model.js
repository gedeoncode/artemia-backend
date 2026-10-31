const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const validator = require("validator");

const userSchema = new mongoose.Schema(
  {
    // Identity
    firstName: { type: String, trim: true, minlength: 2, maxlength: 50 },
    lastName: { type: String, trim: true, minlength: 2, maxlength: 50 },
    name: { type: String, trim: true, minlength: 2, maxlength: 50 },
    phone: {
      type: String,
      unique: true,
      trim: true,
      validate: {
        validator: (v) => /^\+?\d{9,15}$/.test(v),
        message: (props) => `${props.value} is not a valid phone number`,
      },
    },

    email: {
      type: String,
      unique: true,
      trim: true,
      lowercase: true,
      required: true,
      validate: [validator.isEmail, "Invalid email address"],
    },

    password: { type: String, required: true, select: false },

    avatar: {
      type: String,
      default:
        "https://res.cloudinary.com/ds5vslfbu/image/upload/v1762490914/default_user_avatar_jtleuz.png",
    },
    previousAvatars: [
      {
        url: String,
        replacedAt: { type: Date, default: Date.now },
      },
    ],
    // General user meta
    role: {
      type: String,
      enum: ["user", "seller", "admin"],
      default: "user",
    },
    signupIntent: {
      type: String,
      enum: ["BECOME_SELLER", "BROWSE"], // relevant during registration only
      default: null,
    },

    isBlocked: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },

    isEmailVerified: { type: Boolean, default: true }, // only verified users exist here
    emailVerifiedAt: Date,
    isPhoneVerified: { type: Boolean, default: false },

    lastLoginAt: Date,
    lastPasswordChangeAt: Date,
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  },
);

// === Indexes ===
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ phone: 1 });
userSchema.index({ firstName: 1, lastName: 1 });
userSchema.index({ role: 1 });

// === Virtuals ===
userSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`.trim();
});
userSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

// === Password Hashing ===
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12); // configurable rounds
  this.lastPasswordChangeAt = Date.now();
  next();
});

// === Instance Methods ===
userSchema.methods.matchPassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Push previous avatar URL to history
userSchema.pre("save", function (next) {
  if (this.isModified("avatar") && this.isNew === false) {
    // Push previous avatar URL to history
    if (this.avatar && this.previousAvatars.length < 5) {
      this.previousAvatars.push({
        url: this.avatar,
        replacedAt: new Date(),
      });
    }
  }
  next();
});

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
