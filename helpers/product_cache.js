import { redisClient } from "../config/redis.config";

export const HOMEPAGE_CACHE_KEY = "home:data:v1";

export async function invalidateHomeCache(redis) {
  try {
    await redisClient.del(HOMEPAGE_CACHE_KEY);
    console.log("🔄 Homepage cache invalidated");
  } catch (err) {
    console.error("❌ Failed to invalidate homepage cache:", err);
  }
}
