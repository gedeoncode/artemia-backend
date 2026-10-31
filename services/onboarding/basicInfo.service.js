const mongoose = require("mongoose");
const Seller = require("../../models/Seller.model");
const { basicInfoSchema } = require("./validators/basicInfo.validator");
const { updateProgress } = require("./progress.service");
const { AppError } = require("../../utils/AppError");

/**
 * Save seller basic information
 * Owns its mongoose transaction (enterprise pattern)
 */
exports.saveBasicInfo = async ({ sellerId, payload }) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    /**
     * 1. Load seller in transaction
     */
    const seller = await Seller.findById(sellerId).session(session);
    if (!seller) {
      throw new AppError("Seller not found", 404, "SELLER_NOT_FOUND");
    }

 
    /**
     * 2. progress (single source of truth)
     */
    const progress = await updateProgress(seller._id, "BASICINFO", { session });

    /**
     * 3. Commit transaction
     */
    await session.commitTransaction();

    /**
     * 4. Return normalized response
     */
    return {
      ...progress,
      draft: Object.fromEntries(seller.onboarding.draft),
    };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};
