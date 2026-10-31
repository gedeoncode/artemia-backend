const User = require("../models/User.model");
const Seller = require("../models/Seller.model");
const { AppError } = require("../utils/AppError");
const { validateSellerAccount } = require("../utils/validateSellerAccount");
const { buildAuthPayload } = require("../utils/auth");
const { ROUTES } = require("../constants/routesRedirect.contants");

class AuthService {
  async login({ email, password }) {
    // 1️⃣ Validate input
    if (!email || !password) {
      throw new AppError(
        "Email and password are required",
        400,
        "CREDENTIALS_MISSING",
      );
    }

    // 2️⃣ Fetch user with password for verification
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      throw new AppError(
        "Invalid email or password",
        401,
        "INVALID_CREDENTIALS",
      );
    }

    // 3️⃣ Verify password
    const isValid = await user.matchPassword(password);
    if (!isValid) {
      throw new AppError("Invalid password", 401, "INVALID_PASSWORD");
    }

    // 4️⃣ Verify email
    if (!user.isEmailVerified) {
      throw new AppError("Please verify your email", 403, "EMAIL_NOT_VERIFIED");
    }

    // 5️⃣ Handle seller-specific validation
    let seller = null;
    if (user.role === "seller") {
      seller = await validateSellerAccount(user);
    }

    // 6️⃣ Build auth payload for controller (without session)
    const payload = buildAuthPayload(user, seller);

    return { user: payload, seller };
  }

  // services/auth/resolveRedirect.ts

 resolveRedirect(user) {
  if (!user) {
    return ROUTES.LOGIN;
  }

  // Suspended accounts always blocked
  if (user.suspended) {
    return ROUTES.ACCOUNT_SUSPENDED;
  }

  // Admins
  if (user.role === "admin") {
    return ROUTES.ADMIN_DASHBOARD;
  }

  // Sellers
  if (user.role === "seller") {
    if (!user.onboardingCompleted) {
      return ROUTES.SELLER_DASHBOARD;
    }

    if (!user.sellerApproved) {
      return ROUTES.SELLER_PENDING;
    }

    return ROUTES.SELLER_DASHBOARD;
  }

  // Normal users
  if (user.role === "user") {
    switch (user.signupIntent) {
      case "BECOME_SELLER":
        return ROUTES.SELLER_DASHBOARD;

      case "BROWSE":
      default:
        return ROUTES.HOME;
    }
  }

  return ROUTES.HOME;
}

  async getUserById(userId) {
    return User.findById(userId).lean();
  }

  async getSellerByUserId(userId) {
    return Seller.findOne({ user: userId }).lean();
  }
}

module.exports = new AuthService();
