require("dotenv").config();

const path = require("path");

const { connectDB } = require("../config/db.config");
const Banner = require("../models/Banner.model");

const banners = require(path.resolve("data/banners/heroSide.js"));

async function main() {
  await connectDB();

  for (const banner of banners) {
    const exists = await Banner.exists({
      placement: banner.placement,
      title: banner.title,
    });

    if (exists) {
      console.log(`⚠ Skipped "${banner.title}"`);
      continue;
    }

    await Banner.create(banner);

    console.log(`✓ Created "${banner.title}"`);
  }

  console.log("✅ Hero banners seeded successfully.");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});