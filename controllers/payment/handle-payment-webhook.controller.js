const {AppError} = require("../../utils/AppError");
const { PROVIDER_HANDLERS } = require("../../constants/"); // maps provider => handler
const { handlePaymentWebhookService } = require("../../services/payment");

const handlePaymentWebhookController = async (req, res, next) => {
  const { provider } = req.params;
  const normalizedProvider = provider?.toLowerCase();
  const handler = PROVIDER_HANDLERS[normalizedProvider];

  if (!handler) {
    return next(
      new AppError("Unsupported payment provider", 400, "UNSUPPORTED_PROVIDER"),
    );
  }

  let event;
  try {
    event = await handler.verifyAndParse(req);
  } catch (err) {
    return next(
      new AppError("Invalid webhook signature", 400, "INVALID_SIGNATURE"),
    );
  }

  try {
    const result = await handlePaymentWebhookService(event);
    return res.status(200).json({ received: true, result });
  } catch (err) {
    next(err);
  }
};

module.exports = handlePaymentWebhookController;
