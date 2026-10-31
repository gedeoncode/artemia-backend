const connectDB = require("./config/db");
const Seller = require("../models/seller.model");

async function removePhoneAndEmailFromSeller() {
  try {
    console.log("🚀 Starting Seller phone & email removal migration...");

    // ---- Connect to DB ----
    await connectDB();

    const collection = Seller.collection;

    // ---- 1️⃣ Drop phone/email indexes if they exist ----
    const indexes = await collection.indexes();

    const indexesToRemove = indexes.filter(
      (index) => index.key?.phone === 1 || index.key?.email === 1
    );

    if (indexesToRemove.length > 0) {
      for (const index of indexesToRemove) {
        console.log(`🗑 Dropping index: ${index.name}`);
        await collection.dropIndex(index.name);
      }
    } else {
      console.log("ℹ️ No phone or email indexes found (already removed)");
    }

    // ---- 2️⃣ Remove phone & email fields from all documents ----
    const result = await collection.updateMany(
      {
        $or: [{ phone: { $exists: true } }, { email: { $exists: true } }],
      },
      {
        $unset: {
          phone: "",
          email: "",
        },
      }
    );

    console.log(
      `✅ Removed phone/email fields from ${result.modifiedCount} documents`
    );

    console.log("🎉 Seller migration completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

removePhoneAndEmailFromSeller();
