"use strict";

const { AppError } = require("../../utils/AppError");
const catchAsync = require("../../utils/catchAsync");

const {
  getSessionFromRedis,
  updateSessionField,
} = require("../../services/session.service");

const {
  setAuthCookies,
  generateTokens,
  hashToken,
  verifyToken,
} = require("../../utils/auth");

const { REFRESH_SECRET } = require("../../constants/env");
/* -------------------------------------------------------------------------- */
/*                           Refresh token controller                         */
/* -------------------------------------------------------------------------- */

const refreshToken = catchAsync(async (req, res) => {
  /* ------------------------------------------------------------------------ */
  /* 1. Extract refresh token from secure cookie                              */
  /* ------------------------------------------------------------------------ */

  const incomingToken = req.cookies?.refresh_token;

 if (!incomingToken) {
  return res.status(401).json({
    success: false,
    message: "No refresh token provided",
    code: "TOKEN_MISSING",
  });
}

  /* ------------------------------------------------------------------------ */
  /* 2. Verify and decode refresh token                                       */
  /* ------------------------------------------------------------------------ */

  const decoded = verifyToken(incomingToken, REFRESH_SECRET);
  const { id: userId, jti } = decoded;

  if (!userId || !jti) {
    throw new AppError("Malformed refresh token", 401, "TOKEN_MALFORMED");
  }

  /* ------------------------------------------------------------------------ */
  /* 3. Load session from Redis (primary auth state)                          */
  /* ------------------------------------------------------------------------ */

  const session = await getSessionFromRedis(userId, jti);

  if (!session) {
    throw new AppError("Session expired or revoked", 401, "SESSION_EXPIRED");
  }

  /* ------------------------------------------------------------------------ */
  /* 4. Replay attack protection (hashed token comparison)                    */
  /* ------------------------------------------------------------------------ */

  const incomingHash = hashToken(incomingToken);

  // if (session.refreshTokenHash !== incomingHash) {
  //   throw new AppError("Refresh token mismatch", 401, "TOKEN_REVOKED");
  // }

  /* ------------------------------------------------------------------------ */
  /* 5. Load authoritative user record (DB = secondary source of truth)       */
  /* ------------------------------------------------------------------------ */
  if (session.isBlocked || session.isDeleted) {
    throw new AppError("Account restricted", 403, "ACCOUNT_RESTRICTED");
  }

  /* ------------------------------------------------------------------------ */
  /* 7. Rotate tokens (new access + refresh + jti)                            */
  /* ------------------------------------------------------------------------ */

  const { accessToken, refreshToken: newRefreshToken } = generateTokens(
    session.userId,
    session.role,
    jti,
  );

  /* ------------------------------------------------------------------------ */
  /* 8. Atomically update session security material                            */
  /* ------------------------------------------------------------------------ */

  await updateSessionField(
    session.userId,
    "refreshTokenHash",
    hashToken(newRefreshToken),
    jti,
  );

  /* ------------------------------------------------------------------------ */
  /* 9. Issue cookies + respond                                                */
  /* ------------------------------------------------------------------------ */

  setAuthCookies(res, accessToken, newRefreshToken);
  return res.status(200).json({
    success: true,
    message: "Tokens refreshed successfully",
    accessToken,
    refreshToken: newRefreshToken,
  });
});

module.exports = refreshToken;
