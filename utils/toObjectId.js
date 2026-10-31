const mongoose = require("mongoose");
function toObjectId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error(`Invalid ObjectId: ${id}`);
  }
  return new mongoose.Types.ObjectId(id);
}

module.exports = { toObjectId };
//object ID function
