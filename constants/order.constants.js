const ORDER_STATUS = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
];
const ORDER_PAYMENT_STATUS = ["unpaid", "paid", "refunded", "failed"];
const PAYMENT_METHODS = ["cash_on_delivery", "mobile", "card",]
const HANDLED_BY = ["seller", "platform"];
const CURRENCY = ["USD", "EUR", "CDF", "KES", "GBP"];
module.exports = {
  ORDER_STATUS,
  HANDLED_BY,
  CURRENCY,
  ORDER_PAYMENT_STATUS,
  PAYMENT_METHODS,
};