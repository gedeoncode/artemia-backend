const mongoose = require("mongoose");
const Product = require("../models/Product.model");
const ProductReview = require("../models/ProductReview.model");
const { pricingSnapshot } = require("../helpers/pricing.helper");

exports.getProductDetail = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      console.log("Id: ", id);
      return res.status(400).json({ message: "Invalid product ID." });
    }

    const productId = new mongoose.Types.ObjectId(id);

    const result = await Product.aggregate([
      // =====================================================
      // 1. BASE PRODUCT VISIBILITY FILTER
      // =====================================================
      {
        $match: {
          _id: productId,
          isDeleted: false,
          "publication.status": "published",
        },
      },

      // =====================================================
      // 2. CATEGORY
      // =====================================================
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
          pipeline: [
            {
              $match: {
                isActive: true,
                isDeleted: false,
              },
            },
            {
              $project: {
                _id: 1,
                name: 1,
                slug: 1,
                nature: 1,
                allowedModes: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$category",
          preserveNullAndEmptyArrays: false,
        },
      },

      // =====================================================
      // 3. SELLER + USER (SAFE PROJECTION ONLY)
      // =====================================================
      {
        $lookup: {
          from: "sellers",
          let: { sellerId: "$seller" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$sellerId"] },
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "user",
                foreignField: "_id",
                as: "user",
                pipeline: [
                  {
                    $project: {
                      _id: 1,
                      name: 1,
                      email: 1,
                      phone: 1,
                    },
                  },
                ],
              },
            },
            {
              $unwind: "$user",
            },
            {
              $project: {
                _id: 1,
                businessName: 1,
                sellerType: 1,
                user: 1,

                // placeholder for future seller metrics
                rating: 1,
                verified: 1,
                since: 1,
                responseTime: 1,
                onlineSince: 1,
              },
            },
          ],
          as: "seller",
        },
      },
      {
        $unwind: {
          path: "$seller",
          preserveNullAndEmptyArrays: true,
        },
      },

      // =====================================================
      // 4. PRODUCT REVIEWS (AGGREGATED, NOT RAW LIST)
      // =====================================================
      {
        $lookup: {
          from: "productreviews",
          let: { productId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$product", "$$productId"] },
                    { $eq: ["$isApproved", true] },
                  ],
                },
              },
            },
            {
              $group: {
                _id: "$product",
                reviewCount: { $sum: 1 },
                rating: { $avg: "$rating" },
              },
            },
          ],
          as: "reviews",
        },
      },
      {
        $unwind: {
          path: "$reviews",
          preserveNullAndEmptyArrays: true,
        },
      },

      // =====================================================
      // 5. COMPUTED MARKETPLACE FIELDS
      // =====================================================
      {
        $addFields: {
          reviewCount: { $ifNull: ["$reviews.reviewCount", 0] },
          rating: {
            $round: [{ $ifNull: ["$reviews.rating", 0] }, 1],
          },

          isPurchasable: {
            $or: [{ $gt: ["$stock", 0] }, "$continueSellingWhenOutOfStock"],
          },
        },
      },

      // =====================================================
      // 6. FINAL SAFE PROJECTION
      // =====================================================
      {
        $project: {
          _id: 1,
          name: 1,
          shortDescription: 1,
          description: 1,
          images: 1,

          category: 1,

          seller: 1,

          pricing: 1,
          details: 1,
          stock: 1,
          inventoryStatus: 1,
          isPurchasable: 1,

          shipping: 1,

          reviewCount: 1,
          rating: 1,

          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);

    // =====================================================
    // 7. RESPONSE HANDLING
    // =====================================================

    if (!result || result.length === 0) {
      return res.status(404).json({
        message: "Product not found.",
      });
    }
    const product = result[0];

    product.pricing = pricingSnapshot(product);

    return res.status(200).json({
      product,
    });
  } catch (error) {
    console.error("Product Detail Error:", error);

    return res.status(500).json({
      message: "Server Error",
    });
  }
};
