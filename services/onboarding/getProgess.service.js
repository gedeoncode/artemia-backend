const Seller = require("../../models/Seller.model");
const { AppError } = require("../../utils/AppError");

/**
 * Fetch onboarding progress for a seller
 */
exports.getProgress = async (sellerId) => {
  const seller = await Seller.findById(sellerId).lean();
  if (!seller) {
    throw new AppError("Seller not found", 404, "SELLER_NOT_FOUND");
  }

  return {
    currentStep: seller.onboarding.step || "ADDRESS",
    status: seller.verificationStatus || "pending",
    type: seller.type || null,
    completedSteps: seller.onboarding.completedSteps || [],
    draft: seller.onboarding.draft,
  };
};
