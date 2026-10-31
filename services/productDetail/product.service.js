const mongoose = require("mongoose");
const Product = require("../../models/Product.model");

class ProductService {
  static async getProductBase(productId) {
    return Product.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(productId),
          isDeleted: false,
          "publication.status": "published",
        },
      },

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
        $unwind: "$category",
      },

      {
        $project: {
          _id: 1,
          name: 1,
          shortDescription: 1,
          description: 1,
          images: 1,
          pricing: 1,
          shipping: 1,
          stock: 1,
          inventoryStatus: 1,
          continueSellingWhenOutOfStock: 1,
          category: 1,
          seller: 1,
          createdAt: 1,
        },
      },
    ]);
  }
}

module.exports = ProductService;