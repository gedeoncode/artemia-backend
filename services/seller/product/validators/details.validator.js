const { AppError } = require("../../../../utils/AppError");

function sanitizeAndValidateDetails(details, attributes) {
  const safeDetails = {};

  const allowedKeys = new Set(attributes.map((a) => a.key));

  for (const [key, value] of Object.entries(details ?? {})) {
    if (!allowedKeys.has(key)) {
      throw new AppError(`Unknown attribute: ${key}`, 400, "INVALID_ATTRIBUTE");
    }

    safeDetails[key] = value;
  }

  return safeDetails;
}

module.exports = {
  sanitizeAndValidateDetails
};
