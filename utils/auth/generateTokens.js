const jwt = require("jsonwebtoken");
const { randomUUID } = require("crypto");

const {
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY,
  JWT_SECRET,
  REFRESH_SECRET,
} = require("../../constants/env");

function generateTokens(userId, role, jti = randomUUID()) {
  const accessToken = jwt.sign(
    {
      id: userId,
      role,
      type: "access",
      jti,
    },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY },
  );

  const refreshToken = jwt.sign(
    {
      id: userId,
      role,
      type: "refresh",
      jti,
    },
    REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY },
  );

  return { accessToken, refreshToken, jti };
}

module.exports = { generateTokens };
