const express = require("express");
const {
  createReview,
  getProductReviews,
  updateReview,
  deleteReview,
} = require("../controllers/productReview.controllers");
const protect = require("../middlewares/protect");
const attachUser = require("../middlewares/attachUser");

const router = express.Router();

// Specific routes first
router.post("/",protect(), createReview);
router.get("/product/:productId", getProductReviews); 
router.put("/:reviewId", protect(), updateReview);
router.delete("/:reviewId", protect(),deleteReview)

module.exports = router;
