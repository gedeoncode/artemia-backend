require("dotenv").config();
const { connectDB } = require("../../config/db.config");
const Banner = require("../../models/Banner.model");
// const Category = require("../models/category.model");
connectDB();
async function removeOldCategories() {
  try {
    await Banner.deleteMany({ placement: "hero_side" });

    console.log(`✅ Updated categorie(s) successfully.`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  }
}

removeOldCategories();
