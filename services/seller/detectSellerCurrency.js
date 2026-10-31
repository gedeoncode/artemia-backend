const Seller = require("../../models/Seller.model");
const { COUNTRY_TO_CURRENCY } = require("../../helpers/contryCurrency");
async function detectSellerCurrency(sellerId) {
  try {
    const seller = await Seller.findById(sellerId)
      .select("preferredCurrency countryCode")
      .lean();

    if (seller?.preferredCurrency) return seller.preferredCurrency;

    if (seller?.countryCode && COUNTRY_TO_CURRENCY[seller.countryCode]) {
      return COUNTRY_TO_CURRENCY[seller.countryCode];
    }
    return "USD";
  } catch {
    return "USD";
  }
}
module.exports = detectSellerCurrency;
