const {
  monerooWebhookHandler,
  stripeWebhookHandler,
  stripeProvider,
  monerooProvider,
} = require("../providers");
const { APP_URL } = require("./env");

const PROVIDER_HANDLERS = {
  moneroo: monerooWebhookHandler,
  stripe: stripeWebhookHandler,
};

const PROVIDERS = {
  stripe: stripeProvider,
  moneroo: monerooProvider,
};
const PAYMENT_STATUS = {
  REQUIRES_PROVIDER_SESSION: "REQUIRES_PROVIDER_SESSION",
  PENDING: "PENDING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
};

// Constants
const PAYMENT_PROVIDERS = {
  MONEROO: "moneroo",
};
const PAYMENT_PROVIDERS_METHODS = {
  MPESA_KE: "mpesa_ke",
};
const DEFAULT_PAYMENT_REDIRECT = `${APP_URL}/seller/payment?paymentSession_id={CHECKOUT_SESSION_ID}`;

module.exports = {
  PROVIDER_HANDLERS,
  PAYMENT_STATUS,
  PROVIDERS,
  PAYMENT_PROVIDERS,
  PAYMENT_PROVIDERS_METHODS,
  DEFAULT_PAYMENT_REDIRECT,
};
