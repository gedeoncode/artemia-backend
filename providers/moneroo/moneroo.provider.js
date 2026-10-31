const { monerooClient } = require("../../config/moneroo.config");
const { sanitizeMetadata, PaymentProviderError } = require("../utils");
/**
 * Ensures metadata values are strings (same pattern as Stripe)
 */


const monerooProvider = {
  createSession: async ({
    amount,
    currency,
    productId,
    user, // 👈 now using enriched user context
    paymentId,
    redirectUrl,
    methods = ["card", "mobile_money"],
  }) => {
    try {
      if (
        !user?.email ||
        !user?.phone ||
        !paymentId ||
        !redirectUrl ||
        !methods
      ) {
        throw new PaymentProviderError(
          "Moneroo requires customer email and phone",
        );
      }

      const metadata = sanitizeMetadata({
        paymentId,
        productId,
        userId: user.id,
      });
      console.log("Meta data", metadata, "User:", user, redirectUrl);

      const response = await monerooClient.post("/payments/initialize", {
        amount,
        currency,
        methods,
        customer: {
          phone: user.phone,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
        },
        metadata,
        description: `Payment for product ${productId}`,
        return_url: "http://artemia.local:3000/seller/payment",
      });

      const { data } = response.data;
      console.log("Data:", data);
      return {
        id: data.id,
        url: data.checkout_url || data.payment_url,
        provider: "moneroo",
        expiresAt: data.expires_at ? new Date(data.expires_at) : undefined,
      };
    } catch (err) {
      console.error(
        "Moneroo session creation failed",
        err.response?.data || err,
      );
      throw new PaymentProviderError("Moneroo session creation failed");
    }
  },
};

module.exports = {
  monerooProvider,

};
