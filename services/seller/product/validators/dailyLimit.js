
const Product = require("../../../../models/Product.model");
const { AppError } = require("../../../../utils/AppError");

async function validateDailyListingLimit({
  sellerId,

  maxDailyListings,
}) {
  const startOfDay = new Date();

  startOfDay.setHours(
    0,

    0,

    0,

    0,
  );

  const todayCount = await Product.countDocuments({
    seller: sellerId,

    createdAt: {
      $gte: startOfDay,
    },
  });

  if (todayCount >= maxDailyListings) {
    throw new AppError(
      "Daily listing limit reached",

      403,

      "DAILY_LISTING_LIMIT_REACHED",
    );
  }
}

module.exports = {
  validateDailyListingLimit,
};
