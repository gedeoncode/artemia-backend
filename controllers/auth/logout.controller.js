const { deleteSession, deleteAllUserSessions } = require("../../services/session.service");
const { AppError } = require("../../utils/AppError");
const { clearAuthCookies } = require("../../utils/auth");
const catchAsync = require("../../utils/catchAsync");

const logout = catchAsync(async (req, res) => {
  if (!req.user?.id || !req.user?.jti) {
    throw new AppError("Not logged in", 401, "UNAUTHORIZED");
  }

  /* ---------------------------------------------------------------------- */
  /* 1️⃣ Invalidate current Redis session                                   */
  /* ---------------------------------------------------------------------- */

  await deleteSession(req.user.id, req.user.jti);

  /* ---------------------------------------------------------------------- */
  /* 2️⃣ Clear auth cookies                                                 */
  /* ---------------------------------------------------------------------- */

  clearAuthCookies(res);

  return res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});

const logoutAll = catchAsync(async (req, res) => {
  if (!req.user?.id) {
    throw new AppError("Not logged in", 401, "UNAUTHORIZED");
  }

  /* ---------------------------------------------------------------------- */
  /* 1️⃣ Invalidate all Redis sessions                                      */
  /* ---------------------------------------------------------------------- */

  await deleteAllUserSessions(req.user.id);

  /* ---------------------------------------------------------------------- */
  /* 2️⃣ Clear auth cookies                                                 */
  /* ---------------------------------------------------------------------- */

  clearAuthCookies(res);

  return res.status(200).json({
    success: true,
    message: "Logged out from all devices",
  });
});

module.exports = {
  logout,
  logoutAll,
};
