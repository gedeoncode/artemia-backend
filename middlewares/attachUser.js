"use strict";

const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../constants/env");
const {
  getSessionFromRedis,
  touchSession,
} = require("../services/session.service");

/* -------------------------------------------------------------------------- */
/*                               JWT utilities                                 */
/* -------------------------------------------------------------------------- */

function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== "access") {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/*                           Token extraction                                  */
/* -------------------------------------------------------------------------- */

function extractAccessToken(req) {
  const authHeader = req.headers.authorization;
   console.log("OPTIONAL TOKEN:", req.headers);
  
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1]?.trim();

    if (
      token &&
      token !== "null" &&
      token !== "undefined"
    ) {
      return token;
    }
  }

  const cookieToken = req.cookies?.access_token;

  if (
    cookieToken &&
    cookieToken !== "null" &&
    cookieToken !== "undefined"
  ) {
    return cookieToken.trim();
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/*                     Optional authentication middleware                      */
/* -------------------------------------------------------------------------- */

const attachUser = async (req, res, next) => {
  try {
    const token = extractAccessToken(req);
    
    // No token → continue as guest
    if (!token) {
      req.user = null;
      return next();
    }
    
    console.log("NO USER ATTACHED FOR:", req.originalUrl);

    /* ---------------------------------------------------------------------- */
    /* 1. Verify JWT                                                          */
    /* ---------------------------------------------------------------------- */
    
    const decoded = verifyAccessToken(token);

    // Invalid token → continue as guest
    if (!decoded) {
      req.user = null;
      return next();
    }

    const { id: userId, jti } = decoded;

    // Malformed payload → continue as guest
    if (!userId || !jti) {
      req.user = null;
      return next();
    }

    /* ---------------------------------------------------------------------- */
    /* 2. Load session                                                        */
    /* ---------------------------------------------------------------------- */

    const session = await getSessionFromRedis(userId, jti);

    // Session revoked/expired → continue as guest
    if (!session) {
      req.user = null;
      return next();
    }

    /* ---------------------------------------------------------------------- */
    /* 3. Enforce account state                                               */
    /* ---------------------------------------------------------------------- */

    if (session.isDeleted || session.isBlocked) {
      req.user = null;
      return next();
    }

    /* ---------------------------------------------------------------------- */
    /* 4. Sliding session                                                     */
    /* ---------------------------------------------------------------------- */

    await touchSession(userId, jti);

    /* ---------------------------------------------------------------------- */
    /* 5. Attach trusted identity                                             */
    /* ---------------------------------------------------------------------- */

    req.user = {
      id: userId,
      _id: userId,
      role: session.role,
      signupIntent: session.signupIntent,
      jti,
    };

    next();
  } catch (error) {
    console.error("Attach User Middleware Error:", error);

    // Never block public routes
    req.user = null;

    next();
  }
};

module.exports = attachUser;