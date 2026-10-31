const { stripe } = require("../../config/stripe.config");
const { sanitizeMetadata, PaymentProviderError } = require("../utils");


const stripeProvider = {
  createSession: async ({ amount, currency, productId, user, paymentId }) => {
    try {
      // make sure our own paymentId is included
      const userId = user.id
      const metadata = sanitizeMetadata({ paymentId, productId, userId });
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency,
              product_data: {
                name: `Listing Fee for Product ${metadata.productId}`,
              },
              unit_amount: Math.round(amount * 100), // cents
            },
            quantity: 1,
          },
        ],
        metadata, // includes our MongoDB Payment._id
        payment_intent_data: {
          metadata, // 👈 copy metadata to the PaymentIntent
        },
        success_url: `${process.env.APP_URL}/seller/payment?paymentSession_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.APP_URL}/payments/cancel`,
      });

      return {
        id: session.id,
        url: session.url,
        provider: "stripe", // helpful for DB consistency
        expiresAt: new Date(session.expires_at * 1000),
      };
    } catch (err) {
      console.error("Stripe session creation failed", err);
      throw new PaymentProviderError("Stripe session creation failed");
    }
  },
};

module.exports = {
  stripeProvider,
};
