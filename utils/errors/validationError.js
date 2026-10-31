class ValidationError extends Error {
  constructor(message, userMessage, details = null) {
    super(message);
    this.userMessage = userMessage;
    this.details = details;
    this.statusCode = 400;
  }
}
module.exports = ValidationError;