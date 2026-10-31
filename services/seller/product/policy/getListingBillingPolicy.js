const {
  BILLING_STATUS,
  COMMISSION_MODEL,
} = require("../../../../constants/product.constants");
const { isLaunchPromotionActive } = require("./launchMode");

function getListingBillingPolicy({ commissionModel }) {
  const freeListingActive = isLaunchPromotionActive();

  if (freeListingActive) {
    return {
      requiresPayment: false,

      listingFeeMinor: 0,

      billingStatus: BILLING_STATUS.PAID,

      reason: "LAUNCH_PROMOTION",
    };
  }

  return {
    requiresPayment: commissionModel === COMMISSION_MODEL.PAP,

    billingStatus:
      commissionModel === COMMISSION_MODEL.PAP
        ? BILLING_STATUS.PENDING_PAYMENT
        : BILLING_STATUS.PAID,

    reason: null,
  };
}

module.exports = {
  getListingBillingPolicy,
};
