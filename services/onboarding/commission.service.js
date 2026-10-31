const mongoose = require("mongoose");
const Seller = require("../../models/Seller.model");
const { COMMISSION_MODES } = require("../../constants/onboardingConstants");
const { updateProgress } = require("./progress.service");
const { AppError } = require("../../utils/AppError");

/**
 * Select or update seller commission mode
 */
exports.selectCommissionMode = async ({ sellerId, mode }) => {
  // 1. Validate input (no transaction)
  if (!Object.values(COMMISSION_MODES).includes(mode)) {
    throw new AppError(
      "Invalid commission mode",
      400,
      "INVALID_COMMISSION_MODE",
    );
  }

  // 2. Load seller
  const seller = await Seller.findById(sellerId);
  if (!seller) {
    throw new AppError("Seller not found", 404, "SELLER_NOT_FOUND");
  }

  // 3. Idempotency/content check
  const isSameMode =
    seller.commissionModel === mode &&
    seller.onboarding.completedSteps.includes("MODE");

  if (isSameMode) {
    return {
      success: true,
      step: "MODE",
      message: "Commission mode already selected and step completed.",
    };
  }

  // 4. Start transaction only if an update is needed
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // 5. Apply new commission mode
    seller.commissionModel = mode;

    // 6. Persist
    await seller.save({ session });

    // 7. Advance onboarding progress if step not already completed
    let progress = {};
    if (!seller.onboarding.completedSteps.includes("MODE")) {
      progress = await updateProgress(seller._id, "MODE", { session });
    } else {
      progress = { step: "MODE", completed: true };
    }

    // 8. Commit transaction
    await session.commitTransaction();

    // 9. Return progress
    return progress;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};
