// /lib/cacheKeys.js
const crypto = require("crypto");

/**
 * Build a stable Redis cache key with automatic normalization.
 *
 * @param {string} base - Namespace or base key (e.g. "cat:tree")
 * @param {object} params - Any query/filter parameters
 * @param {object} options - Extra options
 * @returns {string} A safe Redis cache key
 */
function buildCacheKey(base, params = {}, options = {}) {
  const {
    hash = false, // If true → hash long keys
    maxLength = 120, // Convert long keys into hashed version
  } = options;

  // Normalize params: sort keys deterministically
  const normalized = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      let value = params[key];

      // Normalize undefined → null for consistency
      if (value === undefined) value = null;

      acc[key] = value;
      return acc;
    }, {});

  const paramString = Object.entries(normalized)
    .map(([k, v]) => `${k}:${v}`)
    .join("|");

  let key = `${base}:${paramString}`;

  // Hash excessively long keys
  if (hash || key.length > maxLength) {
    const digest = crypto.createHash("sha1").update(key).digest("hex");
    key = `${base}:h:${digest}`;
  }

  return key;
}

// const CACHE_VERSION = 1;

// const buildCacheKey = (base, params) => {
//   return (
//     `${base}:v${CACHE_VERSION}:` +
//     Object.entries(params)
//       .map(([k, v]) => `${k}=${v}`)
//       .join(":")
//   );
// };

module.exports = { buildCacheKey };
/*
usage 
const key = buildCacheKey("cat:tree", {
  rootOnly: true,
  includeDeleted: false,
  maxDepth: null,
});

// cat:tree:includeDeleted:false|maxDepth:null|rootOnly:true
*/