require("dotenv").config();

const fs = require("fs");
const path = require("path");

const { connectDB } = require("../../config/db.config");
const Category = require("../../models/category.model");

const categoriesDir = path.resolve("data/categories");

async function main() {
  await connectDB();

  const files = fs
    .readdirSync(categoriesDir)
    .filter((file) => file.endsWith(".js"));

  for (const file of files) {
    const modulePath = path.join(categoriesDir, file);

    const category = require(modulePath);

    const exists = await Category.exists({
      code: category.code,
    });

    if (exists) {
      console.log(`⚠ Skipped ${category.slug}`);
      continue;
    }

    await Category.create(category);

    console.log(`✓ Created ${category.name}`);
  }

  console.log("Done");
}

main().catch(console.error);