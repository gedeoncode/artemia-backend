
const Seller = require("../models/Seller.model");
const { AppError } = require("../utils/AppError");

const attachSellerBasedOnIntent = async (req, res, next) => {
  if (!req.user || req.user.role !== "seller") {
    return next();
  }

  const seller = await Seller.findOne({ user: req.user.id }).select(
    "_id user  commissionModel verificationStatus status onboardingCompleted onboardingStep sellerType completedSteps onboardingDraft documents "
  );

  if (!seller) {
    return next(
      new AppError("Seller profile not found", 404, "SELLER_PROFILE_MISSING")
    );
  }

  req.seller = seller;
  next();
};

module.exports = attachSellerBasedOnIntent;
