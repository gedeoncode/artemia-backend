const {
  SELLER_TIER,
  SELLER_TIER_POLICIES,
} = require("../../../../constants/seller.constants");

const {
  isLaunchPromotionActive,
} = require("./launchMode");

function getSellerListingPolicy(
  sellerTier = SELLER_TIER.NEW
) {

  const launchMode = isLaunchPromotionActive();

  const basePolicy =
    SELLER_TIER_POLICIES[sellerTier] ??
    SELLER_TIER_POLICIES[SELLER_TIER.NEW];
  let promotion = null;

  switch (sellerTier) {
    case SELLER_TIER.TRUSTED:
      promotion = launchMode
        ? "LAUNCH_PROMOTION"
        : null;
      break;

    case SELLER_TIER.PREMIUM:
      promotion = "PREMIUM";
      break;

    case SELLER_TIER.NEW:
    case SELLER_TIER.VERIFIED:
    default:
      promotion = launchMode
        ? "LAUNCH_PROMOTION"
        : null;
      break;
  }

  return {
    tier: sellerTier,
    launchMode,

    ...basePolicy,

    promotion,
  };
}

module.exports = {
  getSellerListingPolicy,
};