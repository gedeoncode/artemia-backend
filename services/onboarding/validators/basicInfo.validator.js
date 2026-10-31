const Joi = require("joi");

exports.basicInfoSchema = Joi.object({
  sellerType: Joi.string().valid("individual", "company").required(),
  firstName: Joi.when("sellerType", {
    is: "individual",
    then: Joi.string().min(2).max(50).required(),
    otherwise: Joi.forbidden(),
  }),
  lastName: Joi.when("sellerType", {
    is: "individual",
    then: Joi.string().min(2).max(50).required(),
    otherwise: Joi.forbidden(),
  }),
  country: Joi.string().min(2).uppercase().required(), // ISO Alpha-2 code

  dob: Joi.when("sellerType", {
    is: "individual",
    then: Joi.date().less("now").greater("1-1-1900").required().messages({
      "date.base": "Date of birth must be a valid date.",
      "date.less": "Date of birth must be in the past.",
    }),

    otherwise: Joi.forbidden(),
  }),
  businessName: Joi.when("sellerType", {
    is: "company",
    then: Joi.string().min(2).max(100).required(),
    otherwise: Joi.forbidden(),
  }),

  registrationNumber: Joi.when("sellerType", {
    is: "company",
    then: Joi.string().alphanum().min(5).max(50).required(),
    otherwise: Joi.forbidden(),
  }),

  address: Joi.when("sellerType", {
    is: "company",
    then: Joi.string().max(200).required(),
    otherwise: Joi.forbidden(),
  }),

  contactPerson: Joi.when("sellerType", {
    is: "company",
    then: Joi.string().min(2).max(100).required(),
    otherwise: Joi.forbidden(),
  }),
});
