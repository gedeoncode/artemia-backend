
const sanitizeInput = (input, options = {}) => {
  // Return non-string inputs as-is
  if (typeof input !== "string") return input;

  // Merge options with defaults
  const {
    maxLength = 255,
    allowUnicode = false,
    allowHtml = false,
    strict = false,
  } = options;

  let sanitized = input.trim();

  if (!allowHtml) {
    sanitized = sanitized.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // Remove potentially dangerous characters using appropriate pattern
  const pattern = strict
    ? /[^a-zA-Z0-9\s@.-]/g // Only allow basic alphanumeric + selected chars in strict mode
    : allowUnicode
    ? /[^\p{L}\p{N}\s@.-]/gu // Allow Unicode letters/numbers if enabled
    : /[^\w\s@.-]/g; // Default alphanumeric + basic chars

  sanitized = sanitized.replace(pattern, "");
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
};

module.exports = sanitizeInput;
