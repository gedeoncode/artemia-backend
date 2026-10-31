const crypto = require("crypto");

const { MONEROO_WEBHOOK_SECRET } = require("../../constants/env");
const { PaymentProviderError } = require("../utils");

const monerooWebhookHandler = {
  verifyAndParse: async (req) => {
    try {
      const signatureHeader = req.headers["x-moneroo-signature"];

      if (!signatureHeader || !Buffer.isBuffer(req.body)) {
        throw new PaymentProviderError("Invalid Moneroo webhook payload");
      }

      const expected = crypto
        .createHmac("sha256", MONEROO_WEBHOOK_SECRET)
        .update(req.body)
        .digest("hex");

      const received = Buffer.from(signatureHeader, "hex");
      const computed = Buffer.from(expected, "hex");

      if (
        received.length !== computed.length ||
        !crypto.timingSafeEqual(received, computed)
      ) {
        throw new PaymentProviderError("Invalid Moneroo signature");
      }

      const parsed = JSON.parse(req.body.toString("utf8"));
      const { event, data } = parsed;

      if (!data?.metadata?.paymentId) {
        throw new PaymentProviderError("Missing paymentId in Moneroo metadata");
      }

      const paymentId = data.metadata.paymentId;
      const productId = data.metadata.productId;
      const userId = data.metadata.userId;
      const amount = data.amount;

      switch (event.event) {
        case "payment.success":
          return {
            type: "payment.success",
            provider: "moneroo",
            data: {
              paymentId,
              productId,
              userId,
              amount,
              currency: data.amount_formatted?.split(" ")[1] || "KES",
              providerReference: data.id,
            },
          };

        case "payment.failed":
          return {
            type: "payment.failed",
            provider: "moneroo",
            data: {
              paymentId,
              productId,
              userId,
              reason: data.status || "payment_failed",
            },
          };

        default:
          console.log(`Unhandled Moneroo event: ${parsed}`);
          return {
            type: "unhandled",
            provider: "moneroo",
            data: { raw: parsed },
          };
      }
    } catch (err) {
      console.error("Moneroo webhook parse error:", err);
      throw new PaymentProviderError("Moneroo webhook parsing failed");
    }
  },
};

module.exports = {
  monerooWebhookHandler,
};
