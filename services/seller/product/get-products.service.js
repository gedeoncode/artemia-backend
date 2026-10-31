const Product = require("../../../models/Product.model");
const { AppError } = require("../../../utils/AppError");

const buildStatusFilter = (status) => {
  switch (status) {
    case "draft":
      return {
        "publication.status": "draft",
      };

    case "pending_review":
      return {
        "publication.status": "pending_review",
      };

    case "rejected":
      return {
        "publication.status": "rejected",
      };

    case "suspended":
      return {
        "publication.status": "suspended",
      };

    case "archived":
      return {
        "publication.status": "archived",
      };

    case "out_of_stock":
      return {
        "publication.status": "approved",
        inventoryStatus: "out_of_stock",
      };

    case "payment_required":
      return {
        "publication.status": "approved",
        billingStatus: { $ne: "paid" },
      };

    case "active":
      return {
        "publication.status": "approved",
        inventoryStatus: { $ne: "out_of_stock" },
        billingStatus: "paid",
      };

    default:
      return {};
  }
};

const getSellerProductsService = async (query, seller) => {
  if (!seller) {
    throw new AppError(
      "Seller not found",
      404,
      "SELLER_NOT_FOUND",
    );
  }
const tmpProducts = await Product.find({
  seller:seller.id
})
  const page = Math.max(Number(query.page) || 1, 1);

  const limit = Math.min(
    Math.max(Number(query.limit) || 20, 1),
    100,
  );

  const skip = (page - 1) * limit;

  const filter = {
    seller: seller.id,
    isDeleted: { $ne: true },
  };

  if (query.category || query.categoryId) {
    filter.category =
      query.categoryId || query.category;
  }

  if (query.search) {
    filter.name = {
      $regex: query.search,
      $options: "i",
    };
  }

  if (query.status) {
    Object.assign(
      filter,
      buildStatusFilter(query.status),
    );
  }

  const allowedSortFields = {
    createdAt: "createdAt",
    name: "name",
    stock: "stock",
    sales: "sales",
    price: "pricing.currentPriceMinor",
  };

  const sortField =
    allowedSortFields[query.sort] ||
    "createdAt";

  const sortOrder =
    query.order === "asc" ? 1 : -1;

  const [total, products, statsResult] =
    await Promise.all([
      Product.countDocuments(filter),

      Product.find(filter)
        .select({
          name: 1,
          pricing: 1,
          stock: 1,
          sales: 1,
          images: 1,
          category: 1,
          publication: 1,
          inventoryStatus: 1,
          billingStatus: 1,
          createdAt: 1,
          updatedAt: 1,
        })
        .populate({
          path: "category",
          select: "name slug",
        })
        .sort({
          [sortField]: sortOrder,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      Product.aggregate([
        {
          $match: {
            seller: seller._id,
            isDeleted: { $ne: true },
          },
        },

        {
          $group: {
            _id: null,

            all: { $sum: 1 },

            draft: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$publication.status",
                      "draft",
                    ],
                  },
                  1,
                  0,
                ],
              },
            },

            pending_review: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$publication.status",
                      "pending_review",
                    ],
                  },
                  1,
                  0,
                ],
              },
            },

            rejected: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$publication.status",
                      "rejected",
                    ],
                  },
                  1,
                  0,
                ],
              },
            },

            suspended: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$publication.status",
                      "suspended",
                    ],
                  },
                  1,
                  0,
                ],
              },
            },

            archived: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$publication.status",
                      "archived",
                    ],
                  },
                  1,
                  0,
                ],
              },
            },

            out_of_stock: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {
                        $eq: [
                          "$publication.status",
                          "approved",
                        ],
                      },
                      {
                        $eq: [
                          "$inventoryStatus",
                          "out_of_stock",
                        ],
                      },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },

            payment_required: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {
                        $eq: [
                          "$publication.status",
                          "approved",
                        ],
                      },
                      {
                        $ne: [
                          "$billingStatus",
                          "paid",
                        ],
                      },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },

            active: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {
                        $eq: [
                          "$publication.status",
                          "approved",
                        ],
                      },
                      {
                        $eq: [
                          "$billingStatus",
                          "paid",
                        ],
                      },
                      {
                        $ne: [
                          "$inventoryStatus",
                          "out_of_stock",
                        ],
                      },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),
    ]);

  const stats = statsResult[0] || {
    all: 0,
    active: 0,
    draft: 0,
    pending_review: 0,
    rejected: 0,
    suspended: 0,
    archived: 0,
    out_of_stock: 0,
    payment_required: 0,
  };

  return {
    products: products.map((product) => ({
      _id: product._id,

      name: product.name,

      category: product.category,

      price:
        product.pricing?.currentPriceMinor || 0,

      originalPrice:
        product.pricing?.originalPriceMinor || 0,

      currency:
        product.pricing?.currencyCode || "KES",

      stock: product.stock,

      sales: product.sales,

      publicationStatus:
        product.publication?.status,

      inventoryStatus:
        product.inventoryStatus,

      billingStatus:
        product.billingStatus,

      primaryImage:
        product.images?.find(
          (image) => image.isPrimary,
        )?.thumbnailUrl ||
        product.images?.[0]?.thumbnailUrl ||
        null,

      createdAt: product.createdAt,

      updatedAt: product.updatedAt,
    })),

    stats,

    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPreviousPage: page > 1,
    },
  };
};

module.exports = 
  getSellerProductsService
