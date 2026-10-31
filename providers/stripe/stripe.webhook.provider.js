
const { stripe } = require("../../config/stripe.config");
const {  PaymentProviderError } = require("../utils");
const stripeWebhookHandler = {
  verifyAndParse: async (req) => {
    try {
      const sig = req.headers["stripe-signature"];
      if (!sig) throw new Error("Missing Stripe signature header");

      const rawBody = req.body; // express.raw() middleware must be applied
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

      let event;
      try {
        event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
      } catch (err) {
        console.error("Stripe signature verification failed", err);
        throw new PaymentProviderError("Invalid Stripe signature");
      }

      const session = event.data.object;
      const paymentId = session.metadata?.paymentId;

      if (!paymentId) {
        throw new Error("Missing paymentId in Stripe session metadata");
      }

      switch (event.type) {
        case "checkout.session.completed":
          return {
            type: "payment.success",
            provider: "stripe",
            data: {
              paymentId,
              productId: session.metadata.productId,
              userId: session.metadata.userId,
              amount: session.amount_total / 100,
              currency: session.currency.toUpperCase(),
            },
          };

        case "checkout.session.expired":
          return {
            type: "payment.failed",
            provider: "stripe",
            data: {
              paymentId,
              productId: session.metadata.productId,
              userId: session.metadata.userId,
              reason: "session_expired",
            },
          };

        case "payment_intent.succeeded":
          return {
            type: "payment.success",
            provider: "stripe",
            data: {
              paymentId,
              productId: session.metadata.productId,
              userId: session.metadata.userId,
              amount: session.amount_received / 100,
              currency: session.currency.toUpperCase(),
            },
          };

        case "payment_intent.payment_failed":
          return {
            type: "payment.failed",
            provider: "stripe",
            data: {
              paymentId,
              productId: session.metadata.productId,
              userId: session.metadata.userId,
              reason: session.last_payment_error?.message || "payment_failed",
            },
          };

        default:
          console.log(`Unhandled Stripe event: ${event.type}`);
          return {
            type: "unhandled",
            provider: "stripe",
            data: { raw: event },
          };
      }
    } catch (err) {
      console.error("Stripe webhook parse error:", err);
      throw new PaymentProviderError("Stripe webhook parsing failed");
    }
  },
};

module.exports = {
  stripeWebhookHandler,
};
