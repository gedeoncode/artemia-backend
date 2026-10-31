const Seller = require("../models/Seller.model");
const { AppError } = require("./AppError");

/**
 * Validates seller eligibility at login / protected access
 * @param {Object} user - Authenticated User document
 */
const validateSellerAccount = async (user) => {
  if (user.role !== "seller") return null;

  const seller = await Seller.findOne({ user: user._id }).lean();

  if (!seller) {
    throw new AppError(
      "Seller profile not found",
      403,
      "SELLER_PROFILE_MISSING"
    );
  }

  if (seller.verificationStatus === "rejected") {
    throw new AppError("Seller account is rejected", 403, "SELLER_REJECTED");
  }

  return seller;
};

module.exports = { validateSellerAccount };
