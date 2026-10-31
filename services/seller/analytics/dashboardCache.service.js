// services/dashboardCache.js
const { redisClient } = require('../../../config/redis.config');
const crypto = require('crypto');

class DashboardCache {
  static getCacheKey(sellerId, queryParams) {
    const sortedParams = Object.keys(queryParams)
      .sort()
      .reduce((acc, key) => {
        acc[key] = queryParams[key];
        return acc;
      }, {});
    
    const hash = crypto.createHash('md5')
      .update(JSON.stringify(sortedParams))
      .digest('hex');
    
    return `dashboard:${sellerId}:${hash}`;
  }

  static async get(key) {
    try {
      const cached = await redisClient.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (err) {
      console.error('Cache read error:', err);
      return null;
    }
  }

  static async set(key, data, ttl = 300) {
    try {
      await redisClient.setex(key, ttl, JSON.stringify(data));
    } catch (err) {
      console.error('Cache write error:', err);
    }
  }

  static async invalidate(sellerId) {
    try {
      const keys = await redisClient.keys(`dashboard:${sellerId}:*`);
      if (keys.length) {
        await redisClient.del(keys);
      }
    } catch (err) {
      console.error('Cache invalidation error:', err);
    }
  }
}

module.exports = DashboardCache;