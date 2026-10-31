const mongoose = require("mongoose");
const Product = require("../../../models/Product.model");
const { AppError } = require("../../../utils/AppError");

const ALLOWED_ACTIONS = [
  "archived",
  "restore",
  "delete"
];

const bulkProductActionService = async (
  productIds,
  action,
  seller,
) => {
  
  if (!seller) {
    throw new AppError(
      "Seller not found",
      404,
      "SELLER_NOT_FOUND",
    );
  }

  if (
    !Array.isArray(productIds) ||
    productIds.length === 0
  ) {
    throw new AppError(
      "Product IDs are required",
      400,
      "PRODUCT_IDS_REQUIRED",
    );
  }

  if (
    !ALLOWED_ACTIONS.includes(action)
  ) {
    throw new AppError(
      "Invalid bulk action",
      400,
      "INVALID_BULK_ACTION",
    );
  }

  const invalidIds = productIds.filter(
    (id) =>
      !mongoose.Types.ObjectId.isValid(id),
  );

  if (invalidIds.length) {
    throw new AppError(
      "One or more product IDs are invalid",
      400,
      "INVALID_PRODUCT_IDS",
    );
  }

  const session =
    await mongoose.startSession();

  try {
    session.startTransaction();

    const products = await Product.find({
      _id: { $in: productIds },
      seller: seller._id,
      isDeleted: { $ne: true },
    }).session(session);

    if (!products.length) {
      throw new AppError(
        "No products found",
        404,
        "PRODUCTS_NOT_FOUND",
      );
    }

    const productIdsToUpdate = [];

    for (const product of products) {
      const status =
        product.publication?.status;

      switch (action) {
        case "archive":
          if (
            [
              "draft",
              "pending_review",
              "approved",
              "rejected",
            ].includes(status)
          ) {
            productIdsToUpdate.push(
              product._id,
            );
          }
          break;

        case "restore":
          if (status === "archived") {
            productIdsToUpdate.push(
              product._id,
            );
          }
          break;

        case "delete":
          productIdsToUpdate.push(
            product._id,
          );
          break;
      }
    }

    if (
      !productIdsToUpdate.length
    ) {
      throw new AppError(
        "No products eligible for this action",
        400,
        "NO_ELIGIBLE_PRODUCTS",
      );
    }

    let update;

    switch (action) {
      case "archive":
        update = {
          $set: {
            "publication.status":
              "archived",
          },
        };
        break;

      case "restore":
        update = {
          $set: {
            "publication.status":
              "pending_review",
          },
        };
        break;

      case "delete":
        update = {
          $set: {
            isDeleted: true,
            deletedAt: new Date(),
          },
        };
        break;
    }

    const result =
      await Product.updateMany(
        {
          _id: {
            $in: productIdsToUpdate,
          },
          seller: seller._id,
        },
        update,
        { session },
      );

    await session.commitTransaction();

    return {
      action,
      matchedCount:
        result.matchedCount,
      modifiedCount:
        result.modifiedCount,
      affectedProducts:
        productIdsToUpdate.length,
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

module.exports =
  bulkProductActionService;