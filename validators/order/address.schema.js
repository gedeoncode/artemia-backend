const Joi = require("joi");

const addressSchema = Joi.object({
  fullName: Joi.string().trim().required(),

  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{10,14}$/)
    .required(),

  province: Joi.string().optional().allow("", null),

  city: Joi.string().optional().allow("", null),

  commune: Joi.string().optional().allow("", null),

  neighborhood: Joi.string().required(),

  street: Joi.string().optional().allow("",null),

  houseNumber: Joi.string().optional().allow("", null),

  landmark: Joi.string().optional().allow("", null),

  deliveryInstructions: Joi.string().optional().allow("", null),

  location: Joi.object({
    type: Joi.string().valid("Point").default("Point"),
    coordinates: Joi.array()
      .items(Joi.number())
      .length(2)
      .optional(), // [lng, lat]
  }).optional(),

  deliveryMethod: Joi.string()
    .valid("express", "hub")
    .default("express"),

  isDefault: Joi.boolean().optional(),

});

module.exports = { addressSchema };