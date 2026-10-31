const isDealActive = (deal) => {
  if (!deal || !deal.isActive) return false;

  const now = new Date();

  if (deal.status === "paused" || deal.status === "expired") {
    return false;
  }

  if (deal.start && now < new Date(deal.start)) {
    return false;
  }

  if (deal.expiry && now >= new Date(deal.expiry)) {
    return false;
  }

  return true;
};

const calculateDealPriceMinor = (pricing) => {
  const { currentPriceMinor, deal } = pricing;

  if (!isDealActive(deal)) {
    return currentPriceMinor;
  }

  switch (deal.type) {
    case "fixed_price":
    case "clearance":
    case "flash_sale":
      return deal.priceMinor;

    case "percentage":
      return Math.round(
        currentPriceMinor * (1 - deal.percentage / 100)
      );

    default:
      return currentPriceMinor;
  }
};

const pricingSnapshot = (product) => {
  const pricing = product.pricing;

  const originalPriceMinor = pricing.originalPriceMinor;
  const currentPriceMinor = pricing.currentPriceMinor;

  const effectivePriceMinor = calculateDealPriceMinor(pricing);

  const discountAmountMinor = Math.max(
    0,
    originalPriceMinor - effectivePriceMinor
  );

  const discountPercentage =
    originalPriceMinor > 0
      ? Math.round((discountAmountMinor / originalPriceMinor) * 100)
      : 0;

  const activeDeal = isDealActive(pricing.deal);

  return {
    currencyCode: pricing.currencyCode,

    originalPriceMinor,

    currentPriceMinor,

    effectivePriceMinor,

    discountAmountMinor,

    discountPercentage,

    hasDiscount: discountAmountMinor > 0,

    hasActiveDeal: activeDeal,

    appliedDeal: activeDeal ? pricing.deal : null,
  };
};

module.exports = {
  pricingSnapshot,
};