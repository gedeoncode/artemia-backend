const {AppError} = require("../../utils/AppError");
module.exports = async function ensureOnboardingNotCompleted(req, res, next) {
  const seller = req.seller
  if (!seller || !seller._id) {
    return next(
      new AppError(
        "Seller onboarding not initialized",
        500,
        "SELLER_CONTEXT_MISSING"
      )
    );
  }

  if (!seller) {
    return next(
      new AppError("Seller account not found", 404, "SELLER_NOT_FOUND")
    );
  }

  if (seller.isDeleted) {
    return next(
      new AppError("Seller account has been deleted", 403, "SELLER_DELETED")
    );
  }

  if (seller.isBlocked) {
    return next(
      new AppError("Seller account is blocked", 403, "SELLER_BLOCKED")
    );
  }

  if (
    seller.onboarding.completed === true ||
    seller.onboarding.status === "completed"
  ) {
    console.log("Onboarding already completed for seller:", seller._id);
    return next(
     new AppError(

        "Onboarding already completed",
        409,
        "ONBOARDING_COMPLETED",
      )
    );
  }

 
  if (["approved", "rejected"].includes(seller.verificationStatus)) {
    return next(
      new AppError(
        `Onboarding cannot be modified after ${seller.verificationStatus}`,
        409,
        "ONBOARDING_LOCKED"
      )
    );
  }


  // if (!["pending", "in_progress"].includes(seller.onboardingStatus)) {
  //   return next(
  //     new AppError(
  //       "Seller onboarding is in an invalid state",
  //       500,
  //       "INVALID_ONBOARDING_STATE"
  //     )
  //   );
  // }
  next();
}; 
