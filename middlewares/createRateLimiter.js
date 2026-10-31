// utils/rateLimiter.js
const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { redisClient } = require("../config/redis.config");


/**
 * Creates a configurable rate limiter middleware
 * @param {Object} options - Configuration options for the rate limiter
 * @param {number} [options.windowMs=15*60*1000] - Time window in milliseconds (default: 15 minutes)
 * @param {number} [options.max=100] - Maximum number of requests per window (default: 100)
 * @param {string} [options.message="Too many requests, please try again later."] - Error message
 * @param {boolean} [options.skipSuccessfulRequests=false] - Whether to skip successful requests
 * @param {boolean} [options.standardHeaders=true] - Enable rate limit headers
 * @param {boolean} [options.legacyHeaders=false] - Disable legacy headers
 * @param {Function} [options.handler] - Custom handler function
 * @param {Object} [options.store] - Custom store (defaults to RedisStore)
 * @param {string} [options.keyPrefix="rl_"] - Prefix for rate limiter keys
 * @returns {Function} Express middleware rate limiter
 */
function createRateLimiter(options = {}) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100,
    message = "Too many requests, please try again later.",
    skipSuccessfulRequests = false,
    standardHeaders = true,
    legacyHeaders = false,
    handler,
    store = new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
    }),
    keyPrefix = 'rl_',
    ...rest
  } = options;

  return rateLimit({
    windowMs,
    max,
    message,
    standardHeaders,
    legacyHeaders,
    skipSuccessfulRequests,
    store,
    keyPrefix,
    handler: handler || ((req, res, next) => {
      const retryAfter = Math.ceil(req.rateLimit.resetTime.getTime() / 1000);
      res.status(429).json({
        success: false,
        error: message,
        code: "MAX_ATTEMPTS",
        retryAfter: retryAfter,
        nextAttempt: new Date(req.rateLimit.resetTime).toISOString(),
      });
    }),
    ...rest,
  });
}

module.exports = {
  createRateLimiter,
};


