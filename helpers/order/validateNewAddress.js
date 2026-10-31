const { addressSchema } = require("../../validators/order/address.schema");
const ValidationError = require("../../utils/errors/validationError");

async function validateNewAddress(newAddress, res) {
  if (newAddress) {
    const { error } = addressSchema.validate(newAddress);
    if (error) {
      console.log("Invalid address data", error.details);
      throw new ValidationError(
        "Invalid address data",
        "The provided address is incomplete or invalid.",
        error.details
      );
    }
  }
}
module.exports = {
  validateNewAddress,
};
