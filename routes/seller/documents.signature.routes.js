// routes/cloudinary.js
const express = require("express");
const router = express.Router();
const {
  getUploadSignature,
} = require("../../controllers/seller/document.cloudinary.controller");

// Middlewares
const protect = require("../../middlewares/protect");
const requireSellerIntent = require("../../middlewares/onboarding/requireIntent");
const ensureSellerOnboarding = require("../../middlewares/onboarding/ensureOnboarding");

router.post(
  "/sign-upload",
  protect(), // authenticated user
  requireSellerIntent, // signupIntent === BECOME_SELLER
  ensureSellerOnboarding,
  getUploadSignature,
);

module.exports = router;
