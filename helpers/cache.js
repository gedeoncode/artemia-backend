// Redis caching layer for Category model (enterprise-grade)

const { redisClient } = require("../config/redis.config");
const Cache = {
  prefix: "app:cache:",

  namespacedKey(key) {
    return `${this.prefix}${key}`;
  },

  async get(key) {
    try {
      const data = await redisClient.get(this.namespacedKey(key));
      return data ? JSON.parse(data) : null;
    } catch (err) {
      console.error("Redis GET error:", err);
      return null;
    }
  },

  async set(key, value, ttlSeconds = 300) {
    try {
      const val = JSON.stringify(value);
      const nsKey = this.namespacedKey(key);
      if (ttlSeconds) {
        await redisClient.setex(nsKey, ttlSeconds, val);
      } else {
        await redisClient.set(nsKey, val);
      }
    } catch (err) {
      console.error("Redis SET error:", err);
    }
  },

  async del(key) {
    try {
      await redisClient.del(this.namespacedKey(key));
    } catch (err) {
      console.error("Redis DEL error:", err);
    }
  },

  async purgeByPattern(pattern) {
    try {
      let cursor = "0";
      const match = this.namespacedKey(pattern);
      do {
        const [nextCursor, keys] = await redisClient.scan(
          cursor,
          "MATCH",
          match,
          "COUNT",
          100,
        );
        cursor = nextCursor;
        if (keys.length) await redisClient.del(...keys);
      } while (cursor !== "0");
    } catch (err) {
      console.error("Redis purgeByPattern error:", err);
    }
  },
};


module.exports = {
  Cache,
};
