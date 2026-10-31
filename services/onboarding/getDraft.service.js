const Seller = require("../../models/Seller.model");
const { AppError } = require("../../utils/AppError");

/**
 * Fetch the current draft for a seller
 * Drafts are only returned for steps not yet completed
 */
exports.getDraft = async (sellerId) => {
  const seller = await Seller.findById(sellerId).select("onboarding")
  .lean()
  .exec();
  if (!seller) {
    throw new AppError("Seller not found", 404, "SELLER_NOT_FOUND");
  }

  const onboarding = seller.onboarding ?? {};

  return {
    currentStep: onboarding.step ?? null,
    completedSteps: onboarding.completedSteps ?? [],
    draft: onboarding.draft ?? null,
  };
};
