const mongoose = require("mongoose");
const Payment = require("../../models/Payment.model");
const Product = require("../../models/Product.model");
const {AppError} = require("../../utils/AppError");

const {
  PAYMENT_STATUS,
  PRODUCT_STATUS,
} = require("../../constants/env");

/**
 * Helper: retry wrapper for transient transaction errors
 */
async function runWithRetry(session, fn, retries = 3) {
  while (retries > 0) {
    try {
      await session.withTransaction(fn, {
        writeConcern: { w: "majority" },
        readConcern: { level: "snapshot" },
      });
      return; // success
    } catch (err) {
      if (err.hasErrorLabel && err.hasErrorLabel("TransientTransactionError")) {
        retries--;
        console.warn(
          "⚠️ Retrying transaction due to transient error:",
          err.message,
        );
      } else {
        throw err; // non-retryable error
      }
    }
  }
  throw new Error("Transaction failed after retries");
}

/**

 *
 * Example:
 *   POST /api/webhooks/payments/:provider
 */

const handlePaymentWebhookService = async (event) => {
  if (!event || !event.type) {
    throw new AppError("Invalid webhook event", 400, "INVALID_WEBHOOK_EVENT");
  }

  const session = await mongoose.startSession();

  try {
    await runWithRetry(session, async () => {
      switch (event.type) {
        case "payment.success": {
          const { paymentId, productId, amount } = event.data;

          // Idempotent update
          const payment = await Payment.findOneAndUpdate(
            { _id: paymentId, status: { $ne: PAYMENT_STATUS.COMPLETED } },
            {
              $set: {
                status: PAYMENT_STATUS.COMPLETED,
                completedAt: new Date(),
              },
            },
            { session, new: true },
          );

          if (!payment) return; // Already processed

          await Product.findByIdAndUpdate(
            productId,
            { $set: { status: PRODUCT_STATUS.ACTIVATED } },
            { session },
          );

          break;
        }

        case "payment.failed": {
          const { paymentId, reason } = event.data;

          await Payment.findOneAndUpdate(
            { _id: paymentId },
            { $set: { status: PAYMENT_STATUS.FAILED, failureReason: reason } },
            { session },
          );
          break;
        }

        default:
          // Unhandled event — can log for monitoring
          break;
      }
    });

    return { success: true, type: event.type };
  } catch (err) {
    throw new AppError(
      "Webhook processing failed",
      500,
      "WEBHOOK_PROCESS_FAILED",
    );
  } finally {
    session.endSession();
  }
};

module.exports = handlePaymentWebhookService;
