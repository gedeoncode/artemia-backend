// src/routes/registration.routes.js

const express = require("express");
const RegistrationController = require("../controllers/registration.controller");

const router = express.Router();

/**
 * STEP 1 — Start registration with email
 */
router.post("/start", RegistrationController.startRegistration);

/**
 * STEP 2 — Set role (user or seller)
 */
router.post("/signup-intent", RegistrationController.setSignupIntent);

/**
 * STEP 3 — Submit personal information
 */
router.post("/personal-info", RegistrationController.submitPersonalInfo);


/**
 * STEP 4 — Send OTP
 */
router.post("/send-otp", RegistrationController.sendOtp);

/**
 * STEP 5 — Verify OTP & complete registration
 */
router.post("/verify-otp", RegistrationController.verifyOtp);

/**
 * STEP 6 — get session
 */
router.get("/session/:sessionId", RegistrationController.getSession);




module.exports = router;
