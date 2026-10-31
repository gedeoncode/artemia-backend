const {
  PRODUCT_REJECT_REASONS,
  PRODUCT_PUBLICATION_STATUS,
} = require("../../../constants/product.constants");

const Product = require("../../../models/Product.model");

exports.bulkProductAction = async (req, res) => {
  try {
    const { action } = req.params;

    const {
      ids,
      reject: { rejectionReason, rejectionCode } = {},
    } = req.body;

    // =========================
    // Validate IDs
    // =========================
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid product IDs provided",
      });
    }

    const VALID_ACTIONS = ["approve", "reject", "unlist"];

    if (!VALID_ACTIONS.includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Invalid bulk action",
      });
    }

    // =========================
    // Reject validation
    // =========================
    if (action === "reject") {
      if (
        !rejectionReason ||
        typeof rejectionReason !== "string" ||
        !rejectionReason.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Rejection reason is required",
        });
      }

      if (
        !rejectionCode ||
        !Object.values(PRODUCT_REJECT_REASONS).includes(rejectionCode)
      ) {
        return res.status(400).json({
          success: false,
          message: "Valid rejection code is required",
        });
      }
    }

    // =========================
    // Base filter
    // =========================
    const filter = {
      _id: { $in: ids },
    };

    let update;

    switch (action) {
      case "approve":
        filter["publication.status"] =
          PRODUCT_PUBLICATION_STATUS.PENDING_REVIEW;

        update = {
          $set: {
            "publication.status":
              PRODUCT_PUBLICATION_STATUS.APPROVED,
          },
          $unset: {
            rejectionReason: "",
            rejectionCode: "",
            rejectedAt: "",
          },
        };
        break;

      case "reject":
        filter["publication.status"] =
          PRODUCT_PUBLICATION_STATUS.PENDING_REVIEW;

        update = {
          $set: {
            "publication.status":
              PRODUCT_PUBLICATION_STATUS.REJECTED,
            rejectionReason: rejectionReason.trim(),
            rejectionCode,
            rejectedAt: new Date(),
          },
        };
        break;

      case "unlist":
        filter["publication.status"] =
          PRODUCT_PUBLICATION_STATUS.APPROVED;

        update = {
          $set: {
            "publication.status":
              PRODUCT_PUBLICATION_STATUS.HIDDEN,
          },
        };
        break;
    }

    const result = await Product.updateMany(filter, update);

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: `No matching products found to ${action}`,
      });
    }

    return res.json({
      success: true,
      message: `${result.modifiedCount} products ${action}ed successfully`,
      count: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error bulk product action:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to process bulk product action",
      error: error.message,
    });
  }
};