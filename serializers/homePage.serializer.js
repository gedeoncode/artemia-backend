
const serializeBanner = (banner) => ({
  id: banner._id,

  title: banner.title,

  description: banner.description ?? "",

  desktopImage: banner.images?.desktop ?? null,

  mobileImage: banner.images?.mobile ?? banner.images?.desktop ?? null,

  alt: banner.alt ?? "",

  placement: banner.placement,

  cta: {
    text: banner.cta?.text ?? "",
    url: banner.cta?.url ?? "",
    openInNewTab: banner.cta?.openInNewTab ?? false,
    type: banner.cta.type,
  },
});

const serializeCategory = (category) => ({
  id: category._id,

  name: category.name,

  slug: category.slug,

  image: category.image,

  description: category.description,

  isFeatured: category.isFeatured,
});

const getActivePrice = (pricing = {}) => {
  const deal = pricing.deal ?? {};

  if (
    deal.isActive &&
    deal.status === "active" &&
    typeof deal.priceMinor === "number"
  ) {
    return deal.priceMinor;
  }

  return pricing.currentPriceMinor;
};

const serializeProduct = (product) => {
  const pricing = product.pricing ?? {};
  const deal = pricing.deal ?? {};

  return {
    id: product._id,

    name: product.name,

    shortDescription: product.shortDescription,

    image: product.images?.[0]?.url ?? null,

    images: product.images ?? [],

    pricing: {
      currencyCode: pricing.currencyCode,

      originalPriceMinor: pricing.originalPriceMinor,

      currentPriceMinor: pricing.currentPriceMinor,

      activePriceMinor: getActivePrice(pricing),

      discountPriceMinor: pricing.discountPriceMinor,

      type: pricing.type,

      unit: pricing.unit,
    },

    deal: {
      isActive: deal.isActive ?? false,

      type: deal.type ?? null,

      label: deal.label ?? null,

      percentage: deal.percentage ?? null,

      priceMinor: deal.priceMinor ?? null,
    },

    category: product.category
      ? {
          id: product.category._id,
          name: product.category.name,
          slug: product.category.slug,
        }
      : null,

    inventory: {
      stock: product.stock,

      status: product.inventoryStatus,
    },

    sales: product.sales,

    badges: {
      featured: product.isFeatured,

      newArrival: product.isNewArrival,

      deal: deal.isActive ?? false,
    },
  };
};
const PRODUCT_SECTION_CONFIG = {
  featured: {
    title: "Nos coups de cœur",
    link: "/shop/featured",
  },
  newArrivals: {
    title: "Découvrez les nouveautés",
    link: "/shop/new-arrivals",
  },
  popular: {
    title: "Les favoris de nos clients",
    link: "/shop/popular",
  },
  deals: {
    title: "Offres à ne pas manquer",
    link: "/shop/deals",
  },
};

const serializeProductSection = ({
  type,
  title,
  link,
  products = [],
}) => {
  if (!products.length) {
    return null;
  }

  return {
    type,
    title,
    link,
    products: products.map(serializeProduct),
  };
};

const serializeHomepage = ({
  heroBanners = [],
  sideBanners = [],
  categories = [],
  featuredProducts = [],
  newArrivals = [],
  popularProducts = [],
  deals = [],
}) => ({
  banners: heroBanners.map(serializeBanner),

  sideBanners: sideBanners.map(serializeBanner),

  categories: categories.map(serializeCategory),

  sections: [
    serializeProductSection({
      type: "featured",
      ...PRODUCT_SECTION_CONFIG.featured,
      products: featuredProducts,
    }),

    serializeProductSection({
      type: "new-arrivals",
      ...PRODUCT_SECTION_CONFIG.newArrivals,
      products: newArrivals,
    }),

    serializeProductSection({
      type: "popular",
      ...PRODUCT_SECTION_CONFIG.popular,
      products: popularProducts,
    }),

    serializeProductSection({
      type: "deals",
      ...PRODUCT_SECTION_CONFIG.deals,
      products: deals,
    }),
  ].filter(Boolean),

  generatedAt: new Date().toISOString(),
});
module.exports = {
  serializeBanner,
  serializeCategory,
  serializeProduct,
  serializeHomepage,
};
