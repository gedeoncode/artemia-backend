// scripts/update-existing-categories.js

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const {connectDB} = require("../services/core/db");
const Category = require("../../models/category.model.js");
const categoriesDir = path.resolve("data/categories");
connectDB();


const categoriesDir = path.resolve("data/categories");

const files = fs
  .readdirSync(categoriesDir)
  .filter((file) => file.endsWith(".js"));

for (const file of files) {
  const modulePath = path.join(categoriesDir, file);
  const { default: category } = await import(modulePath);

  await Category.findOneAndUpdate(
    { slug: category.slug },
    {
      $set: category,
    },
    {
      upsert: true,
      new: true,
    }
  );

  console.log(`✓ Synced ${category.name}`);
}

console.log("All categories synced");
process.exit();