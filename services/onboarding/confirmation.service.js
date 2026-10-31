const mongoose = require("mongoose");
const User = require("../../models/User.model");
const Seller = require("../../models/Seller.model");
const emailService = require("../email");
const { updateProgress } = require("./progress.service");
const { AppError } = require("../../utils/AppError");
const { updateSessionField } = require("../session.service");

exports.confirm = async ({ userId, jti }) => {
  if (!userId || !jti) {
    throw new AppError("Malformed refresh token", 401, "TOKEN_MALFORMED");
  }
  /**
   * 1. Load seller (read-only, no transaction yet)
   */
  const seller = await Seller.findOne({ user: userId });
  if (!seller) {
    throw new AppError(
      "Seller onboarding not initialized",
      404,
      "SELLER_NOT_FOUND",
    );
  }

  /**
   * 2. Idempotency check BEFORE starting transaction
   */
  if (
    seller.onboarding.completedSteps.includes("CONFIRMATION") &&
    seller.onboarding.completed
  ) {
    return {
      success: true,
      step: "CONFIRMATION",
      message: "Onboarding already confirmed and completed.",
    };
  }

  /**
   * 3. Start transaction only if mutation is required
   */
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    /**
     * 4. Update onboarding progress (single source of truth)
     */
    const progress = await updateProgress(seller._id, "CONFIRMATION", {
      session,
      completeOnboarding: true,
    });

    /**
     * 5. Assign SELLER role to user
     */
    const user = await User.findById(userId).session(session);
    if (!user) {
      throw new AppError("User not found", 500, "USER_NOT_FOUND");
    }
    let roleChanged = false;
    if (user.role !== "seller") {
      user.role = "seller";
      await user.save({ session });
      roleChanged = true;
    }

    /**
     * 6. Commit transaction
     */
    await session.commitTransaction();

    /**
     * 7. Async side-effects (non-blocking)
     */
    if (roleChanged) {
      updateSessionField(userId, "role", "seller", jti).catch((err) => {
        console.error("Failed to update session role:", err);
        // Optional: queue retry
      });
    }
    emailService
      .sendEmail({
        to: user.email,
        type: "INFORMATION_REVIEW",
        data: { sellerName: seller.fullName || "Cher vendeur" },
        highPriority: true,
      })
      .catch(console.error);

    return {
      sellerId: seller._id,
      onboardingCompleted: true,
      progress,
    };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};
