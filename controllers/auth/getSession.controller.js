"use strict";

const { AppError } = require("../../utils/AppError");
const catchAsync = require("../../utils/catchAsync");
const { getSessionFromRedis } = require("../../services/session.service");

/* -------------------------------------------------------------------------- */
/*                        Session introspection controller                    */
/* -------------------------------------------------------------------------- */

const getSessionController = catchAsync(async (req, res, next) => {
  const { id: userId, jti } = req.user;

  if (!userId || !jti) {
    return next(
      new AppError("Invalid session context", 401, "SESSION_INVALID"),
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Load session from Redis (single authority)                               */
  /* ------------------------------------------------------------------------ */

  const session = await getSessionFromRedis(userId, jti);

  if (!session) {
    return next(
      new AppError("Session expired or revoked", 401, "SESSION_EXPIRED"),
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Respond with sanitized session state                                     */
  /* ------------------------------------------------------------------------ */

  return res.status(200).json({
    success: true,
    session: {
      userId: session.userId,
      role: session.role,
      isActive: session.isActive,
      isBlocked: session.isBlocked,
      isDeleted: session.isDeleted,
      signupIntent: session.signupIntent,
      lastSeenAt: session.lastSeenAt,
    },
  });
});

module.exports = {
  getSessionController,
};
