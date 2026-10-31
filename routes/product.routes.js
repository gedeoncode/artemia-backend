const express = require("express");
const Product  =require("../models/Product.model");
const {
  getHomePageProducts,

  getSpecialDeals,
  getNewestProductsPaginated,
  getRandomProducts,
  searchSuggestions,
  searchAndFilterProducts,
  getRelatedProducts,
  getProductSection,
  getRecentlyViewedProducts,
} = require("../controllers/product.controller");
const { getProductDetail } = require("../controllers/getProductDetail");

const router = express.Router();

// Specific routes first
router.get("/home", getHomePageProducts);
router.get("/product-sections", getProductSection); // e.g., "Top Rated", "Best Sellers"
router.get("/newest", getNewestProductsPaginated);
router.get("/deals", getSpecialDeals);
router.get("/random", getRandomProducts);
router.get("/search/suggestions", searchSuggestions);
router.get("/search", searchAndFilterProducts);
router.get("/recently-viewed", getRecentlyViewedProducts);
// Related products before the dynamic route
router.get("/related/:id", getRelatedProducts);

// Dynamic route last
router.get("/:id", getProductDetail);


module.exports = router;
