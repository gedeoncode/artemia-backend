const Joi = require("joi");


exports.addressSchema = Joi.object({
  province: Joi.string().trim().allow("").optional(),
city: Joi.string().trim().allow("").optional(),
commune: Joi.string().trim().allow("").optional(),
  neighborhood: Joi.string().trim().min(1).required(),
  avenue: Joi.string().trim().min(1).required(),
  houseOrShop: Joi.string().trim().min(1).required(),
  streetOrLandmark: Joi.string().trim().min(3).required(),
  notes: Joi.string().trim().max(255).allow("").optional(),
});
