const { AppError } = require("../../../../utils/AppError");

const FEE_ENGINE_VERSION = "2026-01";

function toBps(rate) {
  return Math.round((rate ?? 0) * 100);
}

function toMinor(amount) {
  return Math.round((amount ?? 0) * 100);
}

function buildCommissionRule(
  category,
  commissionModel,
) {
  if (!category) {
    throw new AppError(
      "Category required",
      500,
      "CATEGORY_REQUIRED",
    );
  }

  const modeConfig =
    category.modeRules?.[
      commissionModel
    ];

  if (!modeConfig) {
    throw new AppError(
      "Missing commission configuration",
      500,
      "MISSING_COMMISSION_CONFIG",
    );
  }

  return {
    id: `${category._id}-${commissionModel}`,

    version: FEE_ENGINE_VERSION,

    model: commissionModel,

    commissionRateBps: toBps(
      modeConfig.commissionRate,
    ),

    minFeeMinor: toMinor(
      modeConfig.minFee,
    ),

    maxFeeMinor:
      modeConfig.maxFee != null
        ? toMinor(modeConfig.maxFee)
        : Number.MAX_SAFE_INTEGER,

    processingFeeFlatMinor: toMinor(
      modeConfig.processingFeeFlat,
    ),

    processingFeeRateBps: toBps(
      modeConfig.processingFeeRate,
    ),

    taxRateBps: toBps(
      modeConfig.taxRate,
    ),
  };
}

module.exports = {
  buildCommissionRule,
  FEE_ENGINE_VERSION,
};