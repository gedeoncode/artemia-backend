
const Address = require("../../models/Address.model");

async function handleAddressLogic({
  addressId,
  newAddress,
  saveNewAddress,
  setDefault,
  userId,
  session,
}) {
  let deliveryAddressId = null;
  let customAddress = null;

  if (addressId) {
    const found = await Address.findOne({
      _id: addressId,
      client: userId,
    }).session(session);

    if (!found) {
      console.log("Address not found:", addressId);
      throw new Error("Address not found");
    }
    deliveryAddressId = found._id;
  }

  if (newAddress) {
    if (saveNewAddress) {
      if (setDefault) {
        await Address.updateMany(
          { client: userId },
          { $set: { isDefault: false } },
          { session }
        );
      }

      const saved = await Address.create(
        [
          {
            ...newAddress,
            client: userId,
            isDefault: !!setDefault,
          },
        ],
        { session }
      );
      deliveryAddressId = saved[0]._id;
    } else {
      customAddress = { ...newAddress };
    }
  }

  return { deliveryAddressId, customAddress };
}
module.exports = { handleAddressLogic };