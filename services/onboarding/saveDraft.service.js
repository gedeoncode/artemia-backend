const mongoose = require("mongoose");
const Seller = require("../../models/Seller.model");
const { REQUIREDSTEPS } = require("../../constants/onboardingConstants");
const { AppError } = require("../../utils/AppError");

/**
 * Save onboarding draft data for a given step
 * Does NOT advance onboarding progress
 */
exports.saveDraft = async ({ sellerId, step, data }) => {
  if (!step || typeof data !== "object" || data === null) {
    throw new AppError("Invalid draft payload", 400, "INVALID_DRAFT_PAYLOAD");
  }
  const normalized = step.toUpperCase().replace(/[-_]/g, "");

  if (!REQUIREDSTEPS.includes(normalized)) {
    throw new AppError("Invalid step name", 400, "INVALID_ONBOARDING_STEP");
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    /**
     * 1. Load seller inside transaction
     */
    const seller = await Seller.findById(sellerId).session(session);
    if (!seller) {
      throw new AppError("Seller not found", 404, "SELLER_NOT_FOUND");
    }

    /**
     * 2. Save draft data (no progress mutation)
     */
    seller.onboarding.draft.set(normalized, data);

    await seller.save({ session });

    /**
     * 3. Commit transaction
     */
    await session.commitTransaction();

    /**
     * 4. Return current onboarding snapshot
     */
    return {
      currentStep: seller.onboarding.step,
      completedSteps: seller.onboarding.completedSteps,
      draft: Object.fromEntries(seller.onboarding.draft),
    };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};
