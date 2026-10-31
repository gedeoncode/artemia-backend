const {
  SELLER_TIER,
  SELLER_VERIFICATION_STATUS,
} = require("../../../../constants/seller.constants");

function determineSellerTier(seller) {
  if (
    seller.verificationStatus === SELLER_VERIFICATION_STATUS.APPROVED &&
    seller.sellerTier === SELLER_TIER.NEW
  ) {
    return SELLER_TIER.VERIFIED;
  }

  return seller.sellerTier;
}
module.exports = {determineSellerTier};
