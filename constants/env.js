// config.ts
// Production-safe configuration: throws errors if critical env vars are missing

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const NODE_ENV = process.env.NODE_ENV || "development";

// JWT / Auth
export const JWT_SECRET = requireEnv("JWT_SECRET") ;
export const REFRESH_SECRET = requireEnv("REFRESH_SECRET");
export const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || "15m";
export const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || "7d";
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// Cookies
export const COOKIE_SECRET = requireEnv("COOKIE_SECRET");
export const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || "localhost";

// Database
export const MONGODB_URL = requireEnv("MONGODB_URL");

// Redis
export const REDIS_URI = process.env.REDIS_URI || "redis://localhost:6379";

// Cors 
export const CORS_ORIGINS = requireEnv("CORS_ORIGINS").split(",");



// Cloudinary
export const CLOUDINARY_CLOUD_NAME = requireEnv("CLOUDINARY_CLOUD_NAME");
export const CLOUDINARY_API_KEY = requireEnv("CLOUDINARY_API_KEY");
export const CLOUDINARY_API_SECRET = requireEnv("CLOUDINARY_API_SECRET");
export const CLOUDINARY_UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || "default_preset";


// moneroo
export const MONEROO_SECRET_KEY = requireEnv("MONEROO_SECRET_KEY");
export const MONEROO_WEBHOOK_SECRET = requireEnv("MONEROO_WEBHOOK_SECRET");
export const MONEROO_BASE_URL = process.env.MONEROO_BASE_URL || "";

// Stripe
export const STRIPE_SECRET_KEY = requireEnv("STRIPE_SECRET_KEY");
export const STRIPE_WEBHOOK_SECRET = requireEnv("STRIPE_WEBHOOK_SECRET");

// Email
export const EMAIL_SERVICE = process.env.EMAIL_SERVICE || "gmail";
export const EMAIL_USER = requireEnv("EMAIL_USER");
export const EMAIL_PASS = requireEnv("EMAIL_PASS");
export const EMAIL_REPLY_TO = process.env.EMAIL_REPLY_TO || EMAIL_USER;

// OTP settings
export const RESEND_OTP_THROTTLE_MS = Number(process.env.RESEND_OTP_THROTTLE_MS) || 60000;
export const MAX_OTP_RESEND_ATTEMPTS = Number(process.env.MAX_OTP_RESEND_ATTEMPTS) || 3;

// Frontend URLs
export const APP_URL =
  process.env.APP_URL || "https://53cc-129-222-147-243.ngrok-free.app";
export const FRONTEND_URL = process.env.FRONTEND_URL || APP_URL;

// Listing
export const FREE_LISTING_END_DATE  = process.env.FREE_LISTING_END_DATE
