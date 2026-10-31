"use strict";

const jwt = require("jsonwebtoken");
const { AppError } = require("../utils/AppError");
const { JWT_SECRET } = require("../constants/env");
const {
  getSessionFromRedis,
  touchSession,
} = require("../services/session.service");

/* -------------------------------------------------------------------------- */
/*                               JWT utilities                                 */
/* -------------------------------------------------------------------------- */

function isValidJWTFormat(token) {
  return typeof token === "string" && token.split(".").length === 3;
}

function verifyAccessToken(token) {
  try {
    // 🔒 Guard BEFORE verify (prevents "jwt malformed")
    // if (!isValidJWTFormat(token)) {
    //   throw new AppError("Malformed token", 401, "TOKEN_MALFORMED");
    // }

    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.type !== "access") {
      throw new AppError("Invalid token type", 401, "TOKEN_INVALID");
    }

    return decoded;
  } catch (err) {
    console.error("JWT verify failed:", err);

    if (err instanceof AppError) {
      throw err;
    }

    if (err.name === "TokenExpiredError") {
      throw new AppError("Token expired", 401, "TOKEN_EXPIRED");
    }

    if (err.name === "JsonWebTokenError") {
      throw new AppError("Malformed token", 401, "TOKEN_MALFORMED");
    }

    throw new AppError("Invalid token", 401, "TOKEN_INVALID");
  }
}

/* -------------------------------------------------------------------------- */
/*                           Token extraction                                  */
/* -------------------------------------------------------------------------- */

function extractAccessToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1]?.trim();

    if (token && token !== "null" && token !== "undefined") {
      return token;
    }
  }

  const cookieToken = req.cookies?.access_token;

  if (cookieToken && cookieToken !== "null" && cookieToken !== "undefined") {
    return cookieToken.trim();
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/*                           Authorization middleware                          */
/* -------------------------------------------------------------------------- */

const protect =
  (allowedRoles = []) =>
  async (req, res, next) => {
    try {
      /* -------------------------------------------------------------------- */
      /* 1. Extract access token                                              */
      /* -------------------------------------------------------------------- */

      const token = extractAccessToken(req);
      if (!token) {
        throw new AppError("Not authenticated", 401, "UNAUTHORIZED");
      }

      /* -------------------------------------------------------------------- */
      /* 2. Verify JWT                                                        */
      /* -------------------------------------------------------------------- */

      const decoded = verifyAccessToken(token);
      const { id: userId, jti } = decoded;

      /* -------------------------------------------------------------------- */
      /* 3. Validate payload BEFORE Redis                                     */
      /* -------------------------------------------------------------------- */

      if (!userId || !jti) {
        throw new AppError("Malformed token", 401, "TOKEN_MALFORMED");
      }

      /* -------------------------------------------------------------------- */
      /* 4. Load session from Redis                                           */
      /* -------------------------------------------------------------------- */

      const session = await getSessionFromRedis(userId, jti);

      if (!session) {
        throw new AppError(
          "Session expired or revoked",
          401,
          "SESSION_EXPIRED",
        );
      }

      /* -------------------------------------------------------------------- */
      /* 5. Enforce account state                                             */
      /* -------------------------------------------------------------------- */

      if (session.isDeleted) {
        throw new AppError("Account not found", 404, "ACCOUNT_NOT_FOUND");
      }

      if (session.isBlocked) {
        throw new AppError("Account blocked", 403, "ACCOUNT_BLOCKED");
      }

      /* -------------------------------------------------------------------- */
      /* 6. Role-based access control                                         */
      /* -------------------------------------------------------------------- */

      if (allowedRoles.length && !allowedRoles.includes(session.role)) {
        throw new AppError("Forbidden", 403, "FORBIDDEN");
      }

      /* -------------------------------------------------------------------- */
      /* 7. Sliding session expiration                                        */
      /* -------------------------------------------------------------------- */

      await touchSession(userId, jti);

      /* -------------------------------------------------------------------- */
      /* 8. Attach trusted identity                                           */
      /* -------------------------------------------------------------------- */

      req.user = {
        id: userId,
        _id: userId,
        role: session.role,
        name: session.name,
        email: session.email,
        phone: session.phone,
        // name:session.na
        signupIntent: session.signupIntent,
        jti,
      };

      next();
    } catch (err) {
      next(err);
    }
  };

module.exports = protect;
