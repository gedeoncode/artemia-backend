const homepageRepository = require("../../repositories/homePage.repository");
const { serializeHomepage } = require("../../serializers/homePage.serializer");

const homepageCache = require("./cache.service");

class HomepageService {
  async buildHomepage() {
    const [
      banners,
      categories,
      featuredProducts,
      newArrivals,
      popularProducts,
      deals,
    ] = await Promise.all([
      homepageRepository.getHomepageBanners(),
      homepageRepository.getHomepageCategories(),
      homepageRepository.getFeaturedProducts(),
      homepageRepository.getNewArrivalProducts(),
      homepageRepository.getPopularProducts(),
      homepageRepository.getDealProducts(),
    ]);

    return serializeHomepage({
      heroBanners: banners.heroBanners,
      sideBanners: banners.sideBanners,

      categories,

      featuredProducts,

      newArrivals,

      popularProducts,

      deals,
    });
  }

  async getHomepage(options = {}) {
    const {
      refresh = true,
      ttl,
    } = options;

    if (refresh) {
      const homepage = await this.buildHomepage();

      await homepageCache.set(homepage, ttl);

      return homepage;
    }

    return homepageCache.remember(
      () => this.buildHomepage(),
      ttl
    );
  }

  async refreshHomepageCache() {
    const homepage = await this.buildHomepage();

    await homepageCache.set(homepage);

    return homepage;
  }

  async invalidateHomepageCache() {
    await homepageCache.invalidate();
  }
}

module.exports = new HomepageService();