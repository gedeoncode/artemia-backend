const { addressSchema } = require("./validators/address.validator");
const mongoose = require("mongoose");
const Seller = require("../../models/Seller.model");
const { updateProgress } = require("./progress.service");
const { AppError } = require("../../utils/AppError");

/**
 * Save or update seller operating address
 */
exports.saveAddress = async ({ sellerId, payload }) => {
  // 1. Validate input
  const { error, value } = addressSchema.validate(payload);
  if (error) {
    throw new AppError(error.details[0].message, 400, "VALIDATION_ERROR");
  }

  // 2. Load seller
  const seller = await Seller.findById(sellerId);
  if (!seller) {
    throw new AppError("Seller not found", 404, "SELLER_NOT_FOUND");
  }

  // 3. Check if the new address is the same as the existing one
  const isSameAddress =
    JSON.stringify(seller.operatingAddress) === JSON.stringify(value);

  if (isSameAddress) {
    return {
      success: true,
      step: "ADDRESS",
      message: seller.onboarding.completedSteps.includes("ADDRESS")
        ? "Address already saved and step completed."
        : "Address saved but onboarding step not yet completed.",
    };
  }

  // 4. Start transaction only if an update is needed
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // 5. Apply new address
    seller.operatingAddress = {
      province: value.province ?? "",
      city: value.city ?? "",
      commune: value.commune ?? "",
      neighborhood: value.neighborhood,
      avenue: value.avenue,
      houseOrShop: value.houseOrShop,
      streetOrLandmark: value.streetOrLandmark,
      notes: value.notes,
    };

    // 6. Persist
    await seller.save({ session });

    // 7. Update onboarding progress if step not already completed
    let progress = {};
    if (!seller.onboarding.completedSteps.includes("ADDRESS")) {
      progress = await updateProgress(seller._id, "ADDRESS", { session });
    } else {
      progress = { step: "ADDRESS", completed: true };
    }

    // 8. Commit
    await session.commitTransaction();

    return {
      ...progress,
      operatingAddress: seller.operatingAddress,
    };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};
