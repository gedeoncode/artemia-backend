const Joi = require("joi");
exports.validateAdminInput = (data) => {
  const schema = Joi.object({
    name: Joi.string().required().min(2).max(50),
    email: Joi.string().required().email(),
    password: Joi.string().required().min(8),
    role: Joi.string().valid("admin", "editor", "viewer").required(),
  });
  return schema.validate(data);
};
exports.validateRoleUpdate = (data) => {
  const schema = Joi.object({
    role: Joi.string().valid("admin", "editor", "viewer").required(),
  });
  return schema.validate(data);
};
