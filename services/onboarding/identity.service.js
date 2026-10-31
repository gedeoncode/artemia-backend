const mongoose = require("mongoose");
const Seller = require("../../models/Seller.model");
const { updateProgress } = require("./progress.service");
const { AppError } = require("../../utils/AppError");
const {
  identitySchema,
  getIdentityFromPayload,
} = require("./validators/identity.validor");

/**
 * Save or update seller identity
 */
exports.saveIdentity = async ({ sellerId, payload }) => {
  console.log("Saving identity for seller:", sellerId);
  console.log("Payload:", payload);
  // 1. Validate input
  const { error, value } = identitySchema.validate(payload);
  if (error) {
    throw new AppError(error.details[0].message, 400, "VALIDATION_ERROR");
  }

  // 2. Load seller
  const seller = await Seller.findById(sellerId);
  if (!seller) {
    throw new AppError("Seller not found", 404, "SELLER_NOT_FOUND");
  }

  // 3. Compare existing identity with new payload
  const existingIdentity = seller.identity || {};
  const newIdentity = getIdentityFromPayload(value);
  // {
  //   dob: value.dob,
  //   nationality: value.nationality,
  //   gender: value.gender,
  //   idDocument: {
  //     type: value.idType ?? "NATIONAL_ID",
  //     number: value.idNumber ?? "",
  //     issuedAt: value.idIssuedAt ?? null,
  //     expiresAt: value.idExpiresAt ?? null,
  //   },
  // };

  const isSameIdentity =
    JSON.stringify(existingIdentity) === JSON.stringify(newIdentity);

  if (isSameIdentity && seller.onboarding.completedSteps.includes("IDENTITY")) {
    return {
      success: true,
      step: "IDENTITY",
      message: "Identity already saved and step completed.",
    };
  }

  // 4. Start transaction only if update is needed
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // 5. Persist new identity
    seller.identity = newIdentity;
    await seller.save({ session });

    // 6. Advance onboarding progress if not already done
    let progress = {};
    if (!seller.onboarding.completedSteps.includes("IDENTITY")) {
      progress = await updateProgress(seller._id, "IDENTITY", { session });
    } else {
      progress = { step: "IDENTITY", completed: true };
    }

    // 7. Commit transaction
    await session.commitTransaction();

    return {
      ...progress,
      identity: seller.identity,
    };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};
