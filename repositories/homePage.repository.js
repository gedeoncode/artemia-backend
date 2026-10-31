const Banner = require("../models/Banner.model");
const Category = require("../models/category.model");
const Product = require("../models/Product.model");

const DEFAULT_LIMIT = 12;

class HomepageRepository {
  constructor() {
    this.productProjection = [
      "name",
      "images",
      "pricing",
      "category",
      "seller",
      "sales",
      "stock",
      "inventoryStatus",
      "isFeatured",
      "isNewArrival",
      "publication",
      "createdAt",
    ].join(" ");
  }

  getPublishedProductFilter() {
    return {
      isDeleted: false,
      "publication.status": "published",
    };
  }

  getActiveBannerFilter(placement = "hero") {
    const now = new Date();

    return {
      placement,
      isActive: true,

      $and: [
        {
          $or: [
            { startsAt: null },
            { startsAt: { $exists: false } },
            { startsAt: { $lte: now } },
          ],
        },
        {
          $or: [
            { endsAt: null },
            { endsAt: { $exists: false } },
            { endsAt: { $gte: now } },
          ],
        },
      ],
    };
  }

  async getHomepageBanners() {
    const [heroBanners, sideBanners] = await Promise.all([
      Banner.find(this.getActiveBannerFilter("hero"))
        .sort({ sortOrder: 1 })
        .limit(5),

      Banner.find(this.getActiveBannerFilter("hero_side"))
        .sort({ sortOrder: 1 })
        .limit(2),
    ]);

    return {
      heroBanners: heroBanners.map((hero) => hero.toObject()),
      sideBanners: sideBanners.map((banner) => banner.toObject()),
    };
  }

  async getHomepageCategories(limit = DEFAULT_LIMIT) {
    return Category.find({
      isActive: true,
      status: "active",
      isDeleted: false,
      "publishing.enabled": true,
      "homepage.enabled": true,
    })
      .sort({
        "homepage.order": 1,
        isFeatured: -1,
        name: 1,
      })
      .limit(limit);
  }

  async getFeaturedProducts(limit = DEFAULT_LIMIT) {
    return Product.find({
      ...this.getPublishedProductFilter(),
      isFeatured: true,
    })
      .select(this.productProjection)
      .populate("category", "name slug")
      .sort({
        createdAt: -1,
      })
      .limit(limit)
      .lean();
  }

  async getNewArrivalProducts(limit = DEFAULT_LIMIT) {
    return Product.find({
      ...this.getPublishedProductFilter(),
      isNewArrival: true,
    })
      .select(this.productProjection)
      .populate("category", "name slug")
      .sort({
        createdAt: -1,
      })
      .limit(limit)
      .lean();
  }

  async getPopularProducts(limit = DEFAULT_LIMIT) {
    return Product.find(this.getPublishedProductFilter())
      .select(this.productProjection)
      .populate("category", "name slug")
      .sort({
        sales: -1,
      })
      .limit(limit)
      .lean();
  }

  async getDealProducts(limit = DEFAULT_LIMIT) {
    return Product.find({
      ...this.getPublishedProductFilter(),

      "pricing.deal.isActive": true,
      "pricing.deal.status": "active",
    })
      .select(this.productProjection)
      .populate("category", "name slug")
      .sort({
        "pricing.deal.priority": -1,
        createdAt: -1,
      })
      .limit(limit)
      .lean();
  }
}

module.exports = new HomepageRepository();
