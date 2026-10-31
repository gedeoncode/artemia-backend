const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const { AppError } = require("../AppError");

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function verifyToken(token, SECRET_KEY) {
  try {
    return jwt.verify(token, SECRET_KEY);
  } catch {
    throw new AppError(
      "Invalid or expired refresh token",
      401,
      "TOKEN_INVALID",
    );
  }
}

module.exports = {
  verifyToken,
  hashToken,
};
