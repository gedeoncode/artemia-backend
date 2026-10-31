const CONSTACT_METHOD = ["call", "email", "whatsapp", "sms", "meeting", "note"];
const LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "proposal_sent",
  "negotiation",
  "converted",
  "closed_won",
  "closed_lost",
  "disqualified",
  "inactive",
];
const LEAD_SOURCES = [
  "product_page",
  "search",
  "homepage",
  "recommendation",
  "organic",
  "paid_ads",
  "social_media",
  "email_campaign",
  "referral",
  "walk_in",
  "cold_call",
  "api_integration",
];

module.exports = {
  CONSTACT_METHOD,
  LEAD_STATUSES,
  LEAD_SOURCES,
};
