const { AppError } = require("../../../../utils/AppError");

const ALLOWED_PRICE_TYPES = ["free", "fixed", "range"];

function assertInteger(value, field) {
  if (!Number.isInteger(value)) {
    throw new AppError(
      `${field} must be an integer`,
      400,
      "INVALID_MONEY_VALUE",
    );
  }
}

function validatePricing(pricing) {
  if (!pricing) {
    throw new AppError("Pricing is required", 400, "PRICING_REQUIRED");
  }

  const {
    type,
    currencyCode,
    currentPriceMinor,
    minPriceMinor,
    maxPriceMinor,
  } = pricing;

  if (!ALLOWED_PRICE_TYPES.includes(type)) {
    throw new AppError("Invalid pricing type", 400, "INVALID_PRICE_TYPE");
  }

  if (!currencyCode) {
    throw new AppError("Currency is required", 400, "MISSING_CURRENCY");
  }

  if (type === "fixed") {
    if (currentPriceMinor == null) {
      throw new AppError("Price required", 400, "INVALID_PRICE");
    }

    assertInteger(currentPriceMinor, "currentPriceMinor");

    if (currentPriceMinor <= 0) {
      throw new AppError(
        "Price must be greater than zero",
        400,
        "INVALID_PRICE",
      );
    }
  }

  if (type === "range") {
    if (minPriceMinor == null || maxPriceMinor == null) {
      throw new AppError("Range prices required", 400, "INVALID_PRICE_RANGE");
    }

    assertInteger(minPriceMinor, "minPriceMinor");

    assertInteger(maxPriceMinor, "maxPriceMinor");

    if (minPriceMinor > maxPriceMinor) {
      throw new AppError("Invalid price range", 400, "INVALID_RANGE_ORDER");
    }
  }

  return pricing;
}

module.exports = {
  validatePricing,
};
