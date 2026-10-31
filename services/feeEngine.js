"use strict";

/**
 * Enterprise Fee Engine
 * Versioned, deterministic, minor-unit safe
 */

const ENGINE_VERSION = "1.0.0";

/**
 * Commission rule schema (immutable configuration)
 *
 * {
 *   id: string,
 *   version: string,
 *   model: "PAP" | "PAID_AFTER_SALE",
 *   commissionRateBps: number, // basis points (e.g. 1250 = 12.5%)
 *   minFeeMinor: number,
 *   maxFeeMinor: number,
 *   processingFeeFlatMinor?: number,
 *   processingFeeRateBps?: number,
 *   taxRateBps?: number
 * }
 */

function calculateListingFee({ priceMinor, currencyCode, rule }) {
  // -------------------------
  // 1️⃣ Strict Validation
  // -------------------------

  if (!Number.isInteger(priceMinor) || priceMinor <= 0) {
    throw new Error("Invalid priceMinor. Must be positive integer.");
  }

  if (!currencyCode || typeof currencyCode !== "string") {
    throw new Error("Invalid currencyCode.");
  }

  validateRule(rule);

  // -------------------------
  // 2️⃣ Commission Calculation (Basis Points)
  // -------------------------

  // Avoid floating math: (price * bps) / 10_000
  const rawCommission = Math.floor(
    (priceMinor * rule.commissionRateBps) / 10_000,
  );

  const commissionMinor = clamp(
    rawCommission,
    rule.minFeeMinor,
    rule.maxFeeMinor,
  );

  // -------------------------
  // 3️⃣ Payment Processing Fee
  // -------------------------

  let processingMinor = 0;

  if (rule.processingFeeFlatMinor) {
    processingMinor += rule.processingFeeFlatMinor;
  }

  if (rule.processingFeeRateBps) {
    processingMinor += Math.floor(
      (priceMinor * rule.processingFeeRateBps) / 10_000,
    );
  }

  // -------------------------
  // 4️⃣ Tax on Platform Fees
  // -------------------------

  let taxMinor = 0;

  if (rule.taxRateBps) {
    const taxableBase = commissionMinor + processingMinor;

    taxMinor = Math.floor((taxableBase * rule.taxRateBps) / 10_000);
  }

  // -------------------------
  // 5️⃣ Totals
  // -------------------------

  const totalPlatformFees = commissionMinor + processingMinor + taxMinor;

  if (totalPlatformFees > priceMinor) {
    throw new Error("Platform fees exceed transaction price.");
  }

  const sellerReceivesMinor = priceMinor - totalPlatformFees;

  // -------------------------
  // 6️⃣ Audit Metadata
  // -------------------------

  return {
    engineVersion: ENGINE_VERSION,
    currencyCode,
    priceMinor,

    breakdown: {
      commissionMinor,
      processingMinor,
      taxMinor,
    },

    totals: {
      totalPlatformFeesMinor: totalPlatformFees,
      sellerReceivesMinor,
    },

    metadata: {
      ruleId: rule.id,
      ruleVersion: rule.version,
      commissionRateBps: rule.commissionRateBps,
      minFeeApplied: rawCommission < rule.minFeeMinor,
      maxFeeApplied: rawCommission > rule.maxFeeMinor,
      payableImmediately: rule.model === "PAP",
      calculatedAt: new Date().toISOString(),
    },
  };
}

// -------------------------
// Helpers
// -------------------------

function clamp(value, min, max) {
  if (!Number.isInteger(min) || !Number.isInteger(max)) {
    throw new Error("Invalid clamp boundaries.");
  }
  return Math.min(Math.max(value, min), max);
}

function validateRule(rule) {
  if (!rule || typeof rule !== "object") {
    throw new Error("Invalid commission rule.");
  }

  const requiredIntegers = ["commissionRateBps", "minFeeMinor", "maxFeeMinor"];

  for (const field of requiredIntegers) {
    if (!Number.isInteger(rule[field]) || rule[field] < 0) {
      throw new Error(`Invalid rule field: ${field}`);
    }
  }

  if (rule.maxFeeMinor < rule.minFeeMinor) {
    throw new Error("maxFeeMinor must be >= minFeeMinor.");
  }

  if (rule.commissionRateBps > 10_000) {
    throw new Error("commissionRateBps cannot exceed 100%.");
  }
}

module.exports = {
  calculateListingFee,
};
