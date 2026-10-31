// controllers/admin/products/moderation.controller
const Product = require("../../../models/Product.model");
const mongoose = require("mongoose");

// Toggle featured, new, or deal flags
const FLAG_FIELDS = {
  featured: "isFeatured",
  "new-arrival": "isNewArrival",
  deal: "pricing.deal.isActive",
};

exports.toggleProductFlag = async (req, res) => {
  try {
    const { id, flag } = req.params;

    // =========================
    // Validate ID
    // =========================
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    // =========================
    // Validate flag
    // =========================
    if (!FLAG_FIELDS[flag]) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid flag. Must be one of: featured, new-arrival, deal",
      });
    }

    // =========================
    // Find product
    // =========================
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // =========================
    // Build update
    // =========================
    let update = {};

    if (flag === "deal") {
      const isActive = !product.pricing?.deal?.isActive;

      update["pricing.deal.isActive"] = isActive;

      update["pricing.deal.status"] = isActive
        ? "active"
        : "paused";

      if (isActive && !product.pricing?.deal?.start) {
        update["pricing.deal.start"] = new Date();
      }
    } else {
      const field = FLAG_FIELDS[flag];

      update[field] = !product[field];
    }

    // =========================
    // Update product
    // =========================
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { $set: update },
      {
        new: true,
        runValidators: true,
      },
    );

    return res.json({
      success: true,
      message: `Product ${flag} updated successfully`,
      data: {
        flag,
        product: updatedProduct,
      },
    });
  } catch (error) {
    console.error("Toggle product flag error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to toggle product flag",
      error: error.message,
    });
  }
};

// Approve product (publication flow)
exports.approveProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          "publication.status": "activated",
          "publication.reviewedAt": new Date(),
          "publication.reviewedBy": req.user?._id,
          "publication.rejectionReason": null,
          "publication.rejectionCode": null,
        },
      },
      { new: true },
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.json({
      success: true,
      message: "Product approved successfully",
      data: product,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to approve product",
      error: error.message,
    });
  }
};

// Reject product (publication flow)
exports.rejectProduct = async (req, res) => {
  try {
    const { reason, code } = req.body;

    if (!reason || typeof reason !== "string" || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          "publication.status": "rejected",
          "publication.rejectionReason": reason.trim(),
          ...(code ? { "publication.rejectionCode": code } : {}),
          "publication.reviewedAt": new Date(),
          "publication.reviewedBy": req.user?._id,
        },
      },
      { new: true },
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.json({
      success: true,
      message: "Product rejected successfully",
      data: product,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to reject product",
      error: error.message,
    });
  }
};

// Archive (unlist) product
exports.unlistProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          "publication.status": "archived",
        },
      },
      { new: true },
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.json({
      success: true,
      message: "Product unlisted successfully",
      data: product,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to unlist product",
      error: error.message,
    });
  }
};