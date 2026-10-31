const Joi = require("joi");

// Validation schema
const identitySchema = Joi.object({
  // ✅ REQUIRED
  dob: Joi.date()
    .less("now")
    .required()
    .custom((value, helpers) => {
      const age =
        (Date.now() - new Date(value)) / (365.25 * 24 * 60 * 60 * 1000); // age in years

      if (age < 18) {
        return helpers.error("any.custom", {
          message: "Seller must be at least 18 years old",
        });
      }

      return value;
    }),

  // ✅ REQUIRED
  nationality: Joi.string().uppercase().length(2).required(),

  // ✅ OPTIONALS
  gender: Joi.string().valid("MALE", "FEMALE", "OTHER").optional(),

  idType: Joi.string()
    .valid("NATIONAL_ID", "PASSPORT", "VOTER_CARD")
    .optional(),

  idNumber: Joi.string().trim().min(4).max(64).allow("").optional(),

  idIssuedAt: Joi.date().allow("").optional(),

  idExpiresAt: Joi.date().allow("")
    .optional()
    .custom((value, helpers) => {
      const { idIssuedAt } = helpers.state.ancestors[0];
      if (idIssuedAt && value <= idIssuedAt) {
        return helpers.error("any.custom", {
          message: "Expiry date must be after issue date",
        });
      }
      return value;
    }),
});

// Optional: default values helper for UI / forms
const getIdentityFromPayload = (value = {}) => ({
  dob: value.dob || "",
  nationality: value.nationality || "CD", // default for UI
  gender: value.gender || "", // optional
  idDocument: {
    type: value.idType || "NATIONAL_ID", // UI-friendly default
    number: value.idNumber || "",
    issuedAt: value.idIssuedAt ?? null,
    expiresAt: value.idExpiresAt ?? null,
  },
});

module.exports = {
  identitySchema,
  getIdentityFromPayload,
};