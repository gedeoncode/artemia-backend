const Counter = require("../models/Counter.model");

const { customAlphabet } = require("nanoid"); 
// For randomness (install: `npm install nanoid`)

/**
 * Generates a secure, professional sequence number (e.g., ORD-2025-000001-AB3X).
 * @param {string} prefix - Order prefix (e.g., "ORD").
 * @param {object} options - Configuration options.
 * @param {number} options.seqLength - Sequence padding length (default: 6).
 * @param {boolean} options.includeYear - Whether to include the year (default: true).
 * @param {boolean} options.addRandomSuffix - Adds a random suffix (default: false).
 * @param {number} options.randomLength - Length of random suffix (default: 4).
 * @returns {Promise<string>} - Generated sequence (e.g., "ORD-2025-000001-AB3X").
 */
async function getNextSequence(prefix, options = {}) {
  const {
    seqLength = 6,
    includeYear = true,
    addRandomSuffix = false,
    randomLength = 4,
  } = options;

  // Validate inputs
  if (!prefix || typeof prefix !== "string" || prefix.length < 2) {
    throw new Error("Prefix must be a valid string (min 2 chars)");
  }
  if (seqLength < 1 || seqLength > 10) {
    throw new Error("Sequence length must be between 1 and 10");
  }

  try {
    // Fetch/increment the counter (atomic operation)
    const counter = await Counter.findByIdAndUpdate(
      prefix,
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    // Generate components
    const normalizedPrefix = prefix.toUpperCase().slice(0, 10); // Allow longer prefixes
    const year = includeYear ? `-${new Date().getFullYear()}` : "";
    const paddedSeq = String(counter.seq).padStart(seqLength, "0");

    // Add randomness if enabled (e.g., "AB3X")
    const randomSuffix = addRandomSuffix
      ? `-${customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", randomLength)()}`
      : "";

    return `${normalizedPrefix}${year}-${paddedSeq}${randomSuffix}`;
  } catch (error) {
    console.error("Failed to generate sequence:", error);
    throw new Error("Sequence generation failed. Please retry."); // Custom error message
  }
}
module.exports = getNextSequence;
