const AuthService = require("../services/auth.service");
const { createSessionInRedis } = require("../services/session.service");
const catchAsync = require("../utils/catchAsync");
const { setAuthCookies, generateTokens } = require("../utils/auth");

/**
 * POST /auth/login
 */
const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const { user } = await AuthService.login({
    email,
    password,
  });

  const { accessToken, refreshToken, jti } = generateTokens(user.id, user.role);

  await createSessionInRedis(user, refreshToken, jti);

  setAuthCookies(res, accessToken, refreshToken);

  return res.status(200).json({
    success: true,
    message: "Login successful",
    user,
  });
});

const resolveRedirect = catchAsync(async (req, res) => {
  const user = req.user;
  const redirectTo = AuthService.resolveRedirect(user);

  return res.status(200).json({
    success: true,
    redirectTo,
  });
});

module.exports = { login, resolveRedirect};