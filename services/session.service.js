const crypto = require("crypto");
const { redisClient } = require("../config/redis.config");
const { Cache } = require("../helpers/cache");

const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days

/* -------------------------------------------------------------------------- */
/*                                Key helpers                                 */
/* -------------------------------------------------------------------------- */

function sessionKey(userId, jti) {
  return Cache.namespacedKey(`session:${userId}:${jti}`);
}

function userSessionsKey(userId) {
  return Cache.namespacedKey(`user_sessions:${userId}`);
}

/* -------------------------------------------------------------------------- */
/*                              Helper utilities                              */
/* -------------------------------------------------------------------------- */

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/* -------------------------------------------------------------------------- */
/*                              Session actions                               */
/* -------------------------------------------------------------------------- */

/**
 * Creates a session in Redis (atomic)
 */
async function createSessionInRedis(user, refreshToken, jti) {
  const key = sessionKey(user.id, jti);
  const userIndexKey = userSessionsKey(user.id);

  const session = {
    userId: user.id,
    role: user.role,
    name:user.name,
    email: user.email,
    phone: user.phone,
    isBlocked: Number(user.isBlocked),
    isDeleted: Number(user.isDeleted),
    isActive: Number(user.isActive),
    signupIntent: user.signupIntent,
    refreshTokenHash: hashToken(refreshToken),
    jti,
    createdAt: Date.now(),
    lastSeenAt: Date.now(),
  };

  const multi = redisClient.multi();
  multi.hset(key, session);
  multi.expire(key, SESSION_TTL);

  // Index should NOT expire
  multi.sadd(userIndexKey, jti);

  await multi.exec();
  return { ok: true };
}

/**
 * Fetches a session from Redis
 */
async function getSessionFromRedis(userId, jti) {
  const key = sessionKey(userId, jti);
  const session = await redisClient.hgetall(key);

  if (!session || Object.keys(session).length === 0) return null;

  return {
    userId: session.userId,
    role: session.role,
     name:session.name,
    email: session.email,
    phone: session.phone,
    isActive: session.isActive === "1",
    isBlocked: session.isBlocked === "1",
    isDeleted: session.isDeleted === "1",
    signupIntent: session.signupIntent,
    refreshTokenHash: session.refreshTokenHash,
    jti: session.jti,
    createdAt: Number(session.createdAt),
    lastSeenAt: Number(session.lastSeenAt),
  };
}

/**
 * Touch session activity (explicit TTL refresh)
 */
async function touchSession(userId, jti) {
  const key = sessionKey(userId, jti);

  const exists = await redisClient.exists(key);
  if (!exists) return { ok: false };

  const multi = redisClient.multi();
  multi.hset(key, "lastSeenAt", Date.now());
  multi.expire(key, SESSION_TTL);

  await multi.exec();
  return { ok: true };
}

/**
 * Updates a single session field (NO TTL side effects)
 */
async function updateSessionField(userId, field, value, jti) {
  const key = sessionKey(userId, jti);

  const exists = await redisClient.exists(key);
  if (!exists) return { ok: false };

  await redisClient.hset(key, field, String(value));
  return { ok: true };
}

/**
 * Deletes a single session
 */
async function deleteSession(userId, jti) {
  const key = sessionKey(userId, jti);
  const userIndexKey = userSessionsKey(userId);

  const multi = redisClient.multi();
  multi.del(key);
  multi.srem(userIndexKey, jti);

  await multi.exec();
  return { ok: true };
}

/**
 * Deletes ALL sessions for a user (global logout)
 */
async function deleteAllUserSessions(userId) {
  const userIndexKey = userSessionsKey(userId);
  const jtis = await redisClient.smembers(userIndexKey);

  if (!jtis.length) return { ok: true };

  const multi = redisClient.multi();
  for (const jti of jtis) {
    multi.del(sessionKey(userId, jti));
  }
  multi.del(userIndexKey);

  await multi.exec();
  return { ok: true };
}

module.exports = {
  createSessionInRedis,
  getSessionFromRedis,
  touchSession,
  updateSessionField,
  deleteSession,
  deleteAllUserSessions,
  hashToken,
};
