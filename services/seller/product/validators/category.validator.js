const Category = require(
  "../../../../models/category.model",
);

const { AppError } = require(
  "../../../../utils/AppError",
);

async function validateCategory(
  categoryId,
  commissionModel,
  session,
) {
  const category =
    await Category.findById(categoryId)
      .session(session);
      console.log("category:", category)

  if (!category) {
    throw new AppError(
      "Category not found",
      404,
      "CATEGORY_NOT_FOUND",
    );
  }

  if (
    !category.allowedModes.includes(
      commissionModel,
    )
  ) {
    throw new AppError(
      "Commission mode not allowed",
      400,
      "INVALID_COMMISSION_MODE",
    );
  }

  const modeConfig =
    category.modeRules?.[
      commissionModel
    ];

  if (!modeConfig) {
    throw new AppError(
      "Missing commission configuration",
      400,
      "MISSING_COMMISSION_CONFIG",
    );
  }

  return {
    category,
    modeConfig,
  };
}

module.exports = {
  validateCategory,
};