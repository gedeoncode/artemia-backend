// fixSellerRole.js

const connectDB = require("./config/db");
const Seller = require("../models/Seller.model");
connectDB();

async function fixSellerRole() {
  try {
    const invalid = await Seller.find({ role: { $ne: "seller" } });
    console.log(
      `Found ${invalid.length} seller(s) with invalid or missing role`
    );

    if (invalid.length === 0) {
      console.log("🎉 All sellers have valid roles.");
      return process.exit(0);
    }

    for (const doc of invalid) {
      // Handle undefined, empty array, or wrong type
      let roleValue;

      if (Array.isArray(doc.role)) {
        roleValue = doc.role.find(
          (r) => typeof r === "string" && r.trim() !== ""
        );
      } else if (typeof doc.role === "string" && doc.role.trim() !== "") {
        roleValue = doc.role.trim();
      }

      // Default if no valid value found
      if (!roleValue) roleValue = "seller";

      doc.role = roleValue;
      await doc.save({validateBeforeSave: false});
      console.log(`✅ Fixed seller ${doc._id} → role: "${doc.role}"`);
    }
    console.log(`✅ Updated seller(s) successfully.`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  }
}

fixSellerRole();
