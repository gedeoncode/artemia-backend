const { redisClient } = require("../config/redis.config");

const DEFAULT_CACHE_PATTERNS = [
  "categories:list:*",
  "categories:parents-with-subcategories:*",
  "cat:tree*",
  "cat:details:*",
];

const scanKeys = async (pattern) => {
  let cursor = "0";
  let keys = [];
  do {
    const reply = await redisClient.scan(cursor, "MATCH", pattern);
    cursor = reply[0];
    keys.push(...reply[1]);
  } while (cursor !== "0");
  return keys;
};

// Universal Category Cache Invalidation
const invalidateCategoryCache = async (patterns = DEFAULT_CACHE_PATTERNS) => {
  try {
    const patternList = Array.isArray(patterns) ? patterns : [patterns];

    const keysToDelete = await Promise.all(
      patternList.map(async (pattern) => {
        try {
          return await scanKeys(pattern);
        } catch (err) {
          console.error(`Error fetching keys for pattern ${pattern}:`, err);
          return [];
        }
      }),
    );

    const uniqueKeys = [...new Set(keysToDelete.flat())];
    if (!uniqueKeys.length) return;

    const BATCH_SIZE = 500;
    for (let i = 0; i < uniqueKeys.length; i += BATCH_SIZE) {
      const batch = uniqueKeys.slice(i, i + BATCH_SIZE);
      await redisClient.del(batch);

      // Avoid blocking Redis cluster nodes
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    console.log(`Invalidated ${uniqueKeys.length} cache keys`);
  } catch (err) {
    console.error("Cache invalidation error:", err);
  }
};

module.exports = {
  invalidateCategoryCache,
};
