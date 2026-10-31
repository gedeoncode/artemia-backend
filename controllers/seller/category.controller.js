const categoryService = require("../../services/seller/category.service");

const getCategories = async (req, res) => {
  try {
    const categories = await categoryService.getNestedCategoriesByMode();
    res.json({ success: true, data: categories });
  } catch (err) {
    console.error("GetCategories Error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to load categories" });
  }
};

module.exports = { getCategories };
