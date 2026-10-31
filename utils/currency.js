const { CURRENCY_PRECISION } = require("../constants/currencyConstants");

/**
 * Get the precision (number of decimal places) for a currency.
 * @param {string} currency - Currency code (USD, KES, EUR, etc.)
 * @returns {number} Precision
 */
function getCurrencyPrecision(currency) {
  const precision = CURRENCY_PRECISION[currency?.toUpperCase()];
  if (precision === undefined) {
    throw new Error(`Unsupported currency: ${currency}`);
  }
  return precision;
}

module.exports = { getCurrencyPrecision };
