const express = require("express");
const router = express.Router();
const OnboardingController = require("../controllers/onboarding");

// Middlewares
const protect = require("../middlewares/protect");
const requireIntent = require("../middlewares/onboarding/requireIntent");
const ensureOnboarding = require("../middlewares/onboarding/ensureOnboarding");
const ensureOnboardingNotCompleted = require("../middlewares/onboarding/ensureOnboardingNotCompleted");

router.use(
  protect(), // authenticated user
  requireIntent, // signupIntent === BECOME_SELLER
  ensureOnboarding, // creates seller if missing
);

// GET /progress
router.get("/progress", OnboardingController.getProgress);

// PATCH /basic-info
router.patch(
  "/basic-info",
  ensureOnboardingNotCompleted,
  OnboardingController.saveBasicInfo,
);

// PATCH /address
router.patch(
  "/address",
  ensureOnboardingNotCompleted,
  OnboardingController.saveAddress,
);
// PATCH /identity
router.patch(
  "/identity",
  ensureOnboardingNotCompleted,
  OnboardingController.saveIdentity,
);

// POST /documents
router.post(
  "/upload-documents",
  ensureOnboardingNotCompleted,
  OnboardingController.uploadDocuments,
);

// PATCH /select-mode
router.patch(
  "/select-mode",
  ensureOnboardingNotCompleted,
  OnboardingController.selectCommissionMode,
);

// PATCH /draft
router.patch("/draft", OnboardingController.saveDraft);

// GET /draft
router.get(
  "/draft",
  ensureOnboardingNotCompleted,
  OnboardingController.getDraft,
);

// POST /confirmation
router.post(
  "/confirmation",
  ensureOnboardingNotCompleted,
  OnboardingController.confirmOnboarding,
);

module.exports = router;
