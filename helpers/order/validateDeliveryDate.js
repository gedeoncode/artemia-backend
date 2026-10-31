const ValidationError = require("../../utils/errors/validationError");

async function validateDeliveryDate(deliveryDate, res) {
  if (deliveryDate && new Date(deliveryDate) < new Date()) {
    console.log("Invalid delivery date");
    throw new ValidationError(
      "Invalid delivery date",
      "Delivery date must be in the future."
    );
  }
}
module.exports = { validateDeliveryDate };
