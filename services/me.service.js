/**
 * GET AUTHENTICATED USER PROFILE
 */
const User = require("../models/User.model");
const Seller = require("../models/Seller.model");
const { AppError } = require("../utils/AppError");
const { buildAuthPayload } = require("../utils/auth");

async function getMe({ userId, role }) {
  if (!userId) {
    throw new AppError("User id not found", 404, "ID_NOT_FOUND");
  }
  const user = await User.findById(userId).lean();
  if (!user) {
    throw new AppError("Account not found", 404, "ACCOUNT_NOT_FOUND");
  }

  let seller = null;
  if (role === "seller") {
    seller = await Seller.findOne({ user: user._id }).lean();

    if (!seller) {
      throw new AppError(
        "Seller profile not found",
        404,
        "SELLER_PROFILE_MISSING",
      );
    }
  }

  return { user: buildAuthPayload(user, seller) };
}

module.exports = {
  getMe,
};
