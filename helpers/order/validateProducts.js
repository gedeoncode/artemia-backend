// Helper functions
const ValidationError = require("../../utils/errors/validationError");
const { productSchema } = require("../../validators/order/product.schema");

async function validateProducts(products) {

  if (!products || !Array.isArray(products) || products.length === 0) {
    
    console.log("No products in order", products);
    throw new ValidationError(
      "No products in order.",
      "Please add products to your order before proceeding."
    );
  }

  for (const item of products) {
    const { error } = productSchema.validate(item);
    if (error) {
      console.log("Invalid product data", error.details);
      throw new ValidationError(
        "Invalid product data",
        "Some products in your cart have invalid data.",
        error.details
      );
    }
  }

  const productIds = products.map((p) => p.product);
  if (new Set(productIds).size !== productIds.length) {
    console.log("Duplicate products in order");
    throw new ValidationError(
      "Duplicate products in order",
      "Your order contains duplicate products. Please remove duplicates before proceeding."
    );
  }
}
module.exports = { validateProducts };