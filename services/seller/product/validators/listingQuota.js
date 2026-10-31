const Product = require("../../../../models/Product.model");

const { AppError } = require("../../../../utils/AppError");
function hasReachedLimit(current, limit) {
  if (limit === null) return false;

  return current >= limit;
}

module.exports = {
  hasReachedLimit,
};
async function validateListingQuota({
  sellerId,

  maxActiveListings,
}) {
  const activeCount = await Product.countDocuments({
    seller: sellerId,

    isDeleted: false,

    "publication.status": {
      $in: ["PENDING_REVIEW", "PUBLISHED"],
    },
  });

  if (hasReachedLimit(activeCount, maxActiveListings)) {
    throw new AppError(
      "Listing limit reached",

      403,

      "LISTING_LIMIT_REACHED",
    );
  }
}

module.exports = {
  validateListingQuota,
};
