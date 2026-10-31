const { redisClient } = require("../config/redis.config"); 
const { Cache } = require("../helpers/cache");

const IDEMPOTENCY_TTL_SECONDS = 60 * 10; // 10 minutes
/* -------------------------------------------------------------------------- */
/*                                Key helpers                                 */
/* -------------------------------------------------------------------------- */

function cacheKey(userId, idempotencyKey) {
  return Cache.namespacedKey(`idem:${userId}:${idempotencyKey}`);
}
async function idempotency(req, res, next) {
  const idempotencyKey = req.headers["idempotency-key"];

  if (!idempotencyKey) {
    return next(); // idempotency optional
  }

  const userId = req.user?.id || "anonymous";

  // Namespaced by user to prevent cross-user collisions
  const redisKey = cacheKey(userId,idempotencyKey);

  try {
    const existing = await redisClient.get(redisKey);

    if (existing) {
      const parsed = JSON.parse(existing);

      return res.status(parsed.statusCode).json(parsed.body);
    }

    // Mark as "processing" using SET NX to prevent race condition
    const lock = await redisClient.set(
      `${redisKey}:lock`,
      "processing",
      "NX",
      "EX",
      IDEMPOTENCY_TTL_SECONDS,
    );

    if (!lock) {
      // Another request is processing this same key
      return res.status(409).json({
        success: false,
        message: "Request already in progress",
      });
    }

    // Monkey patch res.json to capture response
    const originalJson = res.json.bind(res);

    res.json = async (body) => {
      const responsePayload = {
        statusCode: res.statusCode,
        body,
      };

      await redisClient.set(
        redisKey,
        JSON.stringify(responsePayload),
        "EX",
        IDEMPOTENCY_TTL_SECONDS,
      );

      await redisClient.del(`${redisKey}:lock`);

      return originalJson(body);
    };

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = {idempotency}