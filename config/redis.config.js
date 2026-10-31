const Redis = require("ioredis");
const { REDIS_URI } = require("../constants/env");
const redisClient = new Redis(REDIS_URI);

redisClient.on("error", (err) => {
  console.error("Redis Client Error", err);
});

module.exports = {
  redisClient,
};
