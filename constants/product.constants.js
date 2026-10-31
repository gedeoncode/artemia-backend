const STOCK_TRACKED_NATURES = ["product", "vehicle"];
const PRODUCT_STATUS = {
  PENDING_PAYMENT: "pending_payment",
  ACTIVATED: "activated",
  SUSPENDED: "suspended",
  PENDING: "pending",
  DELETED: "deleted",
  DRAFT: "draft",
  ARCHIVED: "archived",
  OUT_OF_STOCK: "out_of_stock",
};

const PRODUCT_REJECT_REASONS = {
  POLICY_VIOLATION: "policy_violation",
  FAKE_PRODUCT: "fake_product",
  POOR_IMAGES: "poor_images",
  WRONG_CATEGORY: "wrong_category",
  PRICING_ISSUE: "pricing_issue",
  DUPLICATE_LISTING: "duplicate_listing",
  RESTRICTED_ITEM: "restricted_item",
  OTHER: "other",
};
const PRODUCT_PUBLICATION_STATUS = {
  DRAFT: "draft",
  PENDING_REVIEW: "pending_review",
  APPROVED: "approved",
  PUBLISHED: "published",
  REJECTED: "rejected",
  HIDDEN: "hidden",
  ARCHIVED: "archived",
};
const DEAL_SOURCE = {
  SELLER: "SELLER",

  PLATFORM: "PLATFORM",
};

const BILLING_STATUS = {
  UNPAID: "unpaid",
  PENDING_PAYMENT: "pending_payment",
  PAID: "paid",
  WAIVED: "waived",
};
const HANDLED_BY_MAP = {
  PAP: "seller",
  PAL: "platform",
};
const COMMISSION_MODEL = {
  PAP: "PAP",
  PAL: "PAL",
};
const CURRENCY_CODE = {
  USD: "USD",
  CDF: "CDF",
};

module.exports = {
  BILLING_STATUS,
  STOCK_TRACKED_NATURES,
  PRODUCT_STATUS,
  PRODUCT_REJECT_REASONS,
  PRODUCT_PUBLICATION_STATUS,
  HANDLED_BY_MAP,
  COMMISSION_MODEL,
  DEAL_SOURCE,
  CURRENCY_CODE
};
