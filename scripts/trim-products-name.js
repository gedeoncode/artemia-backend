
const Product = require("../models/Product.model");
const connectDB = require("./config/db");
connectDB();
async function trimProductNames() {
  const products = await Product.find({});
  const updates = products.map((p) => {
    const trimmed = p.name.trim();
    if (trimmed !== p.name) {
      return Product.updateOne({ _id: p._id }, { name: trimmed });
    }
  });
  await Promise.all(updates);
  console.log("✅ Trimmed product names");
  process.exit();
}

trimProductNames();