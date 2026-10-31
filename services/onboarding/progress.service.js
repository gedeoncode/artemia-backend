const Seller = require("../../models/Seller.model");
const { REQUIREDSTEPS } = require("../../constants/onboardingConstants");
const { AppError } = require("../../utils/AppError");

function getStepIndex(stepName) {
  return REQUIREDSTEPS.indexOf(stepName);
}

/**
 * Update seller onboarding progress
 * This is the ONLY place allowed to mutate onboarding state.
 */
async function updateProgress(
  sellerId,
  stepName,
  { session, completeOnboarding = false } = {},
) {
  const step = stepName.toUpperCase();
  const stepIndex = getStepIndex(step);

  if (stepIndex === -1) {
    throw new AppError("Invalid onboarding step", 400, "INVALID_STEP");
  }

  const seller = await Seller.findById(sellerId).session(session);
  if (!seller) {
    throw new AppError("Seller not found", 404, "SELLER_NOT_FOUND");
  }

  // === Lifecycle guards ===
  if (seller.isDeleted) {
    throw new AppError("Seller deleted", 403, "SELLER_DELETED");
  }
  if (seller.isBlocked) {
    throw new AppError("Seller blocked", 403, "SELLER_BLOCKED");
  }

  if (seller.onboarding.completed === true || seller.onboarding.status === "completed") {
    throw new AppError(
      "Onboarding already completed",
      409,
      "ONBOARDING_COMPLETED",
    );
  }
  const currentIndex = getStepIndex(seller.onboarding.step);

  // Prevent skipping steps
  if (stepIndex > currentIndex + 1) {
    throw new AppError(
      "Onboarding step order violation",
      400,
      "STEP_ORDER_VIOLATION",
    );
  }

  // === Update step ===
  seller.onboarding.step = step;

  if (!seller.onboarding.completedSteps.includes(step)) {
    seller.onboarding.completedSteps.push(step);
  }

  /**
   * === Explicit completion gate ===
   */
  if (completeOnboarding) {
    const lastStep = REQUIREDSTEPS[REQUIREDSTEPS.length - 1];

    if (step !== lastStep) {
      throw new AppError(
        "Cannot complete onboarding before final step",
        400,
        "INVALID_COMPLETION_STEP",
      );
    }


    const missing = REQUIREDSTEPS.filter(
      (s) => !seller.onboarding.completedSteps.includes(s),
    );

    if (missing.length) {
      throw new AppError(
        "Onboarding incomplete",
        400,
        "ONBOARDING_INCOMPLETE",
        { missing },
      );
    }

    seller.onboarding.completed = true;
    seller.onboarding.status = "completed";
    seller.onboarding.timestamps.completedAt = new Date();
    // 4. Clear all onboarding drafts
    if (seller.onboarding.draft) {
      seller.onboarding.draft.clear();
    }
  }

  await seller.save({ session });

  const nextStep = REQUIREDSTEPS[getStepIndex(step) + 1] ?? null;

  return {
    currentStep: step,
    completedSteps: seller.onboarding.completedSteps,
    nextStep,
    onboardingCompleted: seller.onboarding.completed || false,
  };
}

module.exports = {
  updateProgress,
};
