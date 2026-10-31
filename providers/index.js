const { monerooProvider } = require("./moneroo/moneroo.provider");
const { monerooWebhookHandler } = require("./moneroo/moneroo.webhook.provider");
const { stripeProvider } = require("./stripe/stripe.provider");
const { stripeWebhookHandler } = require("./stripe/stripe.webhook.provider");

// Future providers can be added here:
// const { paypalProvider } = require("./paypal.provider");

module.exports = {
  // Providers
  monerooProvider,
  stripeProvider,
  // Webhook Handlers
  monerooWebhookHandler,
  stripeWebhookHandler,
  // Common Errors
};
