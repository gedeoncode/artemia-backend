require("dotenv").config();

const fs = require("fs");
const {connectDB} = require("../config/db.config");
const Seller = require("../models/Seller.model");
connectDB();

(async function () {
  try {
    const sellers = await Seller.find().lean();
    const filePath = `./backup_sellers_${Date.now()}.json`;

    fs.writeFileSync(filePath, JSON.stringify(sellers, null, 2));
    console.log(`✅ Backup complete! Saved to ${filePath}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Backup failed:", error);
    process.exit(1);
  }
})();
