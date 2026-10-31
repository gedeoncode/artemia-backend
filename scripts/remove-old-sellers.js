require("dotenv").config();
const { connectDB } = require("../services/core/db");
const Seller = require("../models/seller.model");
connectDB();
async function removeOldSellers() {
  try {
    await Seller.deleteMany(
      { onboarding: { $exists: false } }
    );   

    console.log(`✅ Updated seller(s) successfully.`);
    process.exit(0);

  } catch (error) {
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  }
}

removeOldSellers();