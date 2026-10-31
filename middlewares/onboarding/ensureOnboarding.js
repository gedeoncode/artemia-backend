const Seller = require("../../models/Seller.model");
const { AppError } = require("../../utils/AppError");

const fields = [
  "user",
  "commissionModel",
  "verificationStatus",
  "status",
  "onboarding",
  "isDeleted",
  "isBlocked",
  "sellerType",
  "documents",
];

/**
 * Middleware: ensure seller onboarding exists
 * - Atomically creates seller if missing
 * - Attaches seller to req.seller
 */
module.exports = async function ensureSellerOnboarding(req, res, next) {
  const userId = req.user._id;

  // Fast path: already attached
  if (req.seller) return next();
  
  try {
    // Atomically find or create seller
    let seller = await Seller.findOneAndUpdate(
      { user: userId },
      {
        $setOnInsert: {
          user: userId,
          onboardingStatus: "in_progress",
          onboardingStep: "ADDRESS",
        },
      },
      {
        new: true, // return the updated document
        upsert: true, // create if it doesn't exist
      },
    ).select(fields.join(" "));

    // Lifecycle guards
    if (seller.isDeleted) {
      throw new AppError(
        "Seller account has been deleted",
        403,
        "SELLER_DELETED",
      );
    }

    if (seller.onboarding.completed) {
      throw new AppError(
        "Seller onboarding already completed",
        409,
        "ONBOARDING_ALREADY_COMPLETED",
      );
    }

    // Attach seller to request
    req.seller = seller;
    next();
  } catch (err) {
    // Handle rare duplicate key edge case (race conditions)
    if (err.code === 11000) {
      const seller = await Seller.findOne({ user: userId }).select(
        fields.join(" "),
      );
      if (!seller) {
        return next(
          new AppError(
            "Unable to initialize seller onboarding",
            500,
            "SELLER_INIT_FAILED",
          ),
        );
      }

      req.seller = seller;
      return next();
    }

    next(err);
  }
};
