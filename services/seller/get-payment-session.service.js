const { AppError } = require("../../utils/AppError");
const Payment = require("../../models/Payment.model");

const getPaymentSessionService = async (sessionId, seller) => {
  if (!seller) {
    throw new AppError("Seller not found", 404, "SELLER_NOT_FOUND");
  }

  if (!sessionId || !sessionId.trim()) {
    throw new AppError("Session ID is required", 400, "SESSION_ID_REQUIRED");
  }

  const providerSessionId = sessionId.trim();

  const session = await Payment.findOne({
    providerSessionId,
    userId: seller.id,
  })
    .populate("productId", "name priceMinor status")
    .populate("userId", "name email")
    .lean()
    .exec();

  if (!session) {
    throw new AppError("Payment session not found", 404, "SESSION_NOT_FOUND");
  }

  return session;
};

module.exports = getPaymentSessionService;
