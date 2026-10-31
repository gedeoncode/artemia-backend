const Lead = require("../models/Lead.model.js");
const Product = require("../models/Product.model.js");
const Seller = require("../models/Seller.model.js");
const mongoose = require("mongoose");

const createLead = async (req, res) => {
  try {
    const { productId, contactMethod, source } = req.body;

    // =========================
    // VALIDATION
    // =========================

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    if (!["phone", "whatsapp"].includes(contactMethod)) {
      return res.status(400).json({
        message: "Invalid contact method",
      });
    }

    // =========================
    // PRODUCT
    // =========================

    const product = await Product.findById(productId).populate("seller");

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    // =========================
    // CREATE LEAD
    // =========================

    const lead = await Lead.create({
      seller: product.seller._id,
      product: product._id,
      handledBy: product.handledBy,
      // Optional customer
      customer: req.user?._id || null,

      contactMethod,

      source: source || "product_page",
    });

    // =========================
    // RESPONSE
    // =========================

    res.status(201).json({
      success: true,
      message: "Lead tracked successfully",
      lead,
    });
  } catch (error) {
    console.error("Create Lead Error:", error);

    res.status(500).json({
      message: "Failed to create lead",
    });
  }
};
module.exports = {
  createLead,
};
