function sanitizeMetadata(metadata = {}) {
  return Object.fromEntries(
    Object.entries(metadata).map(([k, v]) => [k, v != null ? String(v) : ""]),
  );
}
 class PaymentProviderError extends Error {
   constructor(message, code = "PAYMENT_PROVIDER_ERROR") {
     super(message);
     this.name = "PaymentProviderError";
     this.code = code;
   }
 }
 module.exports = {
    sanitizeMetadata,
    PaymentProviderError

 }