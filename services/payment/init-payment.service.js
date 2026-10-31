const { getCurrencyPrecision } = require("../../utils/currency");

const { PROVIDERS } = require("../../constants/env");
const { PaymentProviderError } = require("../../providers/utils");

const initPaymentSession = async ({
  amountMinor,
  currency,
  methods,
  productId,
  user,
  provider,
  paymentId,
  redirectUrl,
}) => {
  try {
    // -------------------------
    // 1️⃣ Strict Validation (Minor Units Only)
    // -------------------------

    if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
      throw new Error("Invalid payment amountMinor");
    }

    if (!currency || typeof currency !== "string") {
      throw new Error("Currency is required");
    }

    if (!Array.isArray(methods) || methods.length === 0) {
      throw new Error("Invalid payment methods");
    }

    if (!productId || typeof productId !== "string") {
      throw new Error("Missing or invalid productId");
    }

    if (!user || typeof user !== "object") {
      throw new Error("Missing or invalid user object");
    }

    if (!paymentId || typeof paymentId !== "string") {
      throw new Error("Missing or invalid paymentId");
    }

    const normalizedProvider = provider?.toLowerCase();
    const selectedProvider = PROVIDERS[normalizedProvider];

    if (!selectedProvider) {
      throw new PaymentProviderError(`Unsupported provider: ${provider}`);
    }

    // -------------------------
    // 2️⃣ Currency-Aware Conversion
    // -------------------------

    const precision = getCurrencyPrecision(currency);
    const divisor = 10 ** precision;

    const amount = (amountMinor / divisor).toFixed(precision);

    // -------------------------
    // 3️⃣ Delegate to Provider Adapter
    // -------------------------

    const session = await selectedProvider.createSession({
      amount, // formatted string
      currency,
      methods,
      productId,
      user,
      paymentId,
      redirectUrl,
    });

    // -------------------------
    // 4️⃣ Strict Provider Response Validation
    // -------------------------

    if (
      !session ||
      typeof session.id !== "string" ||
      typeof session.url !== "string"
    ) {
      throw new PaymentProviderError(
        `${provider} returned an invalid session response`,
      );
    }

    return {
      id: session.id,
      url: session.url,
      provider: normalizedProvider,
      expiresAt:
        session.expiresAt instanceof Date
          ? session.expiresAt
          : new Date(Date.now() + 30 * 60 * 1000), // fallback 30 mins
    };
  } catch (err) {
    // Avoid leaking sensitive internals in logs
    console.error("Payment session initialization failed", {
      provider,
      message: err.message,
    });

    throw err instanceof PaymentProviderError
      ? err
      : new PaymentProviderError("Failed to initialize payment session");
  }
};

module.exports = initPaymentSession 
