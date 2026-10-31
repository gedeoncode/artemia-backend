const express = require('express');
const {
  getAllCategories,
  getCategoryTree,
  getCategoryNode,
} = require("../controllers/category.controllers");

const router = express.Router();

// Route to get all categories
// router.get('/featured', getFeaturedCategories);
router.get('/', getAllCategories);
router.get("/tree", getCategoryTree);
router.get("/node", getCategoryNode);


module.exports = router;