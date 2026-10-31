require("dotenv").config();
const Category = require("../../models/category.model.js");

const { connectDB } = require("../../config/db.config.js");

async function migrateAllowedModes() {
  try {
    await connectDB();

    const result = await Category.updateMany(
      { allowedModes: [] },
      {
        $set: {
          allowedModes: ["PAP"],
        },
      },
    );

    console.log("Migration completed");
    console.log(result);
  } catch (error) {
    console.error(error);
  }
}

migrateAllowedModes();