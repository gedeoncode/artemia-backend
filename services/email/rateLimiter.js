const { AppError } = require("../../utils/AppError");

const otpRateLimiter = new Map();
const RATE_LIMIT_MS = 60 * 1000; // 1 minute

function checkOtpLimit(to) {
  const now = Date.now();
  if (otpRateLimiter.has(to) && now - otpRateLimiter.get(to) < RATE_LIMIT_MS) {
    
  throw new AppError(
      "Please wait before requesting another OTP",
      429,
      "WAIT_ANOTHER_OTP",
    );
  }
  otpRateLimiter.set(to, now);
}

module.exports = { checkOtpLimit };
