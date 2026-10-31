const { CONSTACT_METHOD, LEAD_SOURCES } = require("../../constants/lead.constants.js");
const Lead = require("../../models/Lead.model.js");
const Product = require("../../models/Product.model.js");

exports.createLead = async (req, res) => {
  try {
    const { productId, contactMethod, source } = req.body;

    if (!productId) {
      return res.status(400).json({
        message: "Product is required",
      });
    }

    if (!CONSTACT_METHOD.includes(contactMethod)) {
      return res.status(400).json({
        message: "Invalid contact method",
      });
    }
    if (!LEAD_SOURCES.includes(source)) {
      return res.status(400).json({
        message: "Invalid source",
      });
    }

    // Get product and seller
    const foundProduct = await Product.findById(productId)
      .select("seller");

    if (!foundProduct) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    const lead = await Lead.create({
      seller: foundProduct.seller,
      product: productId,
      customer: req.user?._id || null,
      contactMethod,
      source: source || "product_page",
    });

    return res.status(201).json({
      message: "Lead created successfully",
      data: lead,
    });
  } catch (error) {
    console.error("Error creating lead:", error);

    return res.status(500).json({
      message: "Failed to create lead",
    });
  }
};