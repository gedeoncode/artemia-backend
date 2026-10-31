const { redisClient } = require("../../config");

const CACHE_PREFIX = "homepage";
const CACHE_VERSION = "v1";
const DEFAULT_TTL = 60 * 5; // 5 minutes

class HomepageCacheService {
  constructor() {
    this.cacheKey = `${CACHE_PREFIX}:${CACHE_VERSION}`;
  }

  async get() {
    try {
      const cached = await redisClient.get(this.cacheKey);

      if (!cached) {
        return null;
      }

      return JSON.parse(cached);
    } catch (error) {
      console.error("[HomepageCache] Read failed:", error);

      return null;
    }
  }

  async set(data, ttl = DEFAULT_TTL) {
    try {
      await redisClient.set(
        this.cacheKey,
        JSON.stringify(data),
        "EX",
        ttl,
      );
    } catch (error) {
      console.error("[HomepageCache] Write failed:", error);
    }
  }

  async invalidate() {
    try {
      await redisClient.del(this.cacheKey);
    } catch (error) {
      console.error("[HomepageCache] Delete failed:", error);
    }
  }

  async remember(callback, ttl = DEFAULT_TTL) {
    const cached = await this.get();

    if (cached) {
      return cached;
    }

    const fresh = await callback();

    await this.set(fresh, ttl);

    return fresh;
  }

  async exists() {
    try {
      return Boolean(await redisClient.exists(this.cacheKey));
    } catch (error) {
      console.error("[HomepageCache] Exists failed:", error);

      return false;
    }
  }

  getKey() {
    return this.cacheKey;
  }
}

module.exports = new HomepageCacheService();