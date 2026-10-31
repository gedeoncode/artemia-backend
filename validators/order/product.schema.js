
const Joi = require("joi");
const productSchema = Joi.object({
  product: Joi.string().hex().length(24).required(),
  quantity: Joi.number().integer().min(1).required(),
}).unknown(true);
module.exports = {productSchema};
