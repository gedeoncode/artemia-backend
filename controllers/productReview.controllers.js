// controllers/productReviewController.js

const ProductReview = require("../models/ProductReview.model");
const Product = require("../models/Product.model");
const mongoose = require("mongoose");


/**
 * Create review
 * POST /api/reviews
*/
const createReview = async (req, res) => {
    try {
      const { productId, rating, comment } = req.body;
     

    // basic validation
    if (!productId || !rating) {
       console.log("Product ID and rating are required")
      return res.status(400).json({
        success: false,
        message: "Product ID and rating are required",
      });
    }

    // validate rating
    if (rating < 1 || rating > 5) {
       console.log("rating must be between 1 and 5")
      return res.status(400).json({
        success: false,
        message: "rating must be between 1 and 5",
      });
    }

    // check if product exists
    const product = await Product.findById(productId);

    if (!product) {
             console.log("Product not found")

      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // prevent duplicate review
    const existingReview = await ProductReview.findOne({
      product: productId,
      user: req.user._id,
    });

    if (existingReview) {
      console.log("You already reviewed this product")
      return res.status(409).json({
        success: false,
        message: "You already reviewed this product",
      });
    }

    // create review
    const review = await ProductReview.create({
      product: productId,
      user: req.user._id,
      rating,
      comment,
    });
    console.log("Comment posted:", review);
    return res.status(201).json({
      success: true,
      message: "Review created successfully",
      data: review,
    });
  } catch (error) {
    console.error("Create Review Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * Get product reviews
 * GET /api/reviews/product/:productId
 */

const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const skip = (page - 1) * limit;

    const filter = {
      product: productId,
      isApproved: true,
    };
     

    const [reviews, total] = await Promise.all([
      ProductReview.find(filter)
        .populate({
          path: "user",
          select: "name email avatar",
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ProductReview.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      page,
      totalPages: Math.ceil(total / limit),
      totalReviews: total,
      count: reviews.length,

      data: reviews,
    });
  } catch (error) {
    console.error("Get Product Reviews Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch product reviews",
    });
  }
};

/**
 * Update review
 * PUT /api/reviews/:reviewId
 */
const updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;

    const review = await ProductReview.findById(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // ensure ownership
    if (review.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // update fields
    if (rating) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: "Rating must be between 1 and 5",
        });
      }

      review.rating = rating;
    }

    if (comment !== undefined) {
      review.comment = comment;
    }

    await review.save();

    return res.status(200).json({
      success: true,
      message: "Review updated successfully",
      data: review,
    });
  } catch (error) {
    console.error("Update Review Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * Delete review
 * DELETE /api/reviews/:reviewId
 */
const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const review = await ProductReview.findById(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // ensure ownership
    if (review.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    await review.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.error("Delete Review Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = {
  createReview,
  getProductReviews,
  updateReview,
  deleteReview,
};
