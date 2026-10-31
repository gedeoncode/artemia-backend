const { PRODUCT_PUBLICATION_STATUS } = require("./product.constants");

const SELLER_TIER = {
  NEW: "NEW",
  VERIFIED: "VERIFIED",
  TRUSTED: "TRUSTED",
  PREMIUM: "PREMIUM",
};
const SELLER_VERIFICATION_STATUS = {
  PENDING: "pending",
  UNDER_REVIEW: "under_review",
  APPROVED: "approved",
  REJECTED: "rejected",
};

const SELLER_TIER_POLICIES = {
  [SELLER_TIER.NEW]: {
    maxActiveListings: 20,
    maxDailyListings: 5,
    publicationStatus: PRODUCT_PUBLICATION_STATUS.PENDING_REVIEW,
  },

  [SELLER_TIER.VERIFIED]: {
    maxActiveListings: 100,
    maxDailyListings: 20,
    publicationStatus: PRODUCT_PUBLICATION_STATUS.PUBLISHED,
  },

  [SELLER_TIER.TRUSTED]: {
    maxActiveListings: 500,
    maxDailyListings: 100,
    publicationStatus: PRODUCT_PUBLICATION_STATUS.PUBLISHED,
  },

  [SELLER_TIER.PREMIUM]: {
    maxActiveListings: null, // unlimited
    maxDailyListings: null, // unlimited
    publicationStatus: PRODUCT_PUBLICATION_STATUS.PUBLISHED,
  },
};

module.exports = {
  SELLER_TIER,
  SELLER_TIER_POLICIES,
  SELLER_VERIFICATION_STATUS
};
