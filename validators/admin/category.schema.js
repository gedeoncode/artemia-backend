const Joi = require("joi");
const {
  CATEGORY_NATURES,
  CATEGORY_STATUS,
} = require("../../constants/category.constants");
const categoryAttributeSchema = Joi.object({
  key: Joi.string().trim().required(),

  label: Joi.string().trim().required(),

  type: Joi.string()
    .valid("string", "number", "boolean", "date", "enum", "array", "object")
    .required(),

  inputType: Joi.string()
    .valid(
      "text",
      "textarea",
      "number",
      "select",
      "multiselect",
      "checkbox",
      "radio",
      "date",
      "email",
      "phone",
      "url",
    )
    .required(),

  required: Joi.boolean().default(false),

  searchable: Joi.boolean().default(false),

  filterable: Joi.boolean().default(false),

  sortable: Joi.boolean().default(false),

 options: Joi.when("inputType", {
  is: Joi.valid("select", "multiselect", "radio"),
  then: Joi.array()
    .items(
      Joi.object({
        value: Joi.string().trim().required(),
        label: Joi.string().trim().required(),
      })
    )
    .min(1)
    .required(),

  otherwise: Joi.array()
    .items(
      Joi.object({
        value: Joi.string().trim().required(),
        label: Joi.string().trim().required(),
      })
    )
    .default([]),
}),
  placeholder: Joi.string(),

  helpText: Joi.string(),

  defaultValue: Joi.any(),

  validation: Joi.object({
    min: Joi.number(),

    max: Joi.number(),

    minLength: Joi.number().integer().min(0),

    maxLength: Joi.number().integer().min(0),

    regex: Joi.string(),
  }),

  ui: Joi.object({
    order: Joi.number().integer().default(0),

    width: Joi.string().valid("full", "half", "third").default("full"),

    group: Joi.string(),
  }),
});
const homepageRuleSchema = Joi.object({
  ruleType: Joi.string()
    .valid(
      "topDeals",
      "bestSellers",
      "newArrivals",
      "trending",
      "mostViewed",
      "highDiscount",
    )
    .required(),
  limit: Joi.number().integer().min(1).default(10),

  link: Joi.string().uri().allow("").optional(),
});

const createCategorySchema = Joi.object({
  name: Joi.string().max(100).required(),
  code: Joi.string().trim().uppercase(),
  description: Joi.string().max(500).allow(""),
  parent: Joi.string().hex().length(24).allow(null),
  image: Joi.string().uri().allow(""),
  nature: Joi.string()
    .valid(...CATEGORY_NATURES)
    .default("pr"),
  requiresPayment: Joi.boolean().default(false),
  isFeatured: Joi.boolean().default(false),
  status: Joi.string()
    .valid(...CATEGORY_STATUS)
    .default("active"),
  slug: Joi.string().trim().lowercase(),
  attributes: Joi.array().items(categoryAttributeSchema).default([]),
  allowedModes: Joi.array()
    .items(Joi.string().valid("PAP", "PAL"))
    .default(["PAL"]),
  modeRules: Joi.object().default({}),

  // ✅ Added here
  homepageRules: Joi.array().items(homepageRuleSchema).default([]),
  tags: Joi.array().items(Joi.string()).default([]),
    publishing: Joi.object({
    enabled: Joi.boolean().default(true),

    requiresApproval: Joi.boolean().default(false),
  }).default(),

  listingRequirements: Joi.object({
    minImages: Joi.number()
      .integer()
      .min(0)
      .default(1),

    maxImages: Joi.number()
      .integer()
      .min(Joi.ref("minImages"))
      .default(10)
      .messages({
        "number.min":
          "maxImages must be greater than or equal to minImages",
      }),
  }).default(),

});

const querySchema = Joi.object({
  includeDeleted: Joi.boolean().truthy("true").falsy("false").default(true),

  rootOnly: Joi.boolean().truthy("true").falsy("false").default(true),

  maxDepth: Joi.number()
    .integer()
    .min(0)
    .allow(null)
    .custom((v, helpers) => {
      if (v === null || v >= 0) return v;
      return helpers.error("any.invalid");
    })
    .message("maxDepth must be null or a non-negative number"),
});

module.exports = {
  createCategorySchema,
  querySchema,
};
