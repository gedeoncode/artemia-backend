// src/controllers/registration.controller.js

const RegistrationService = require("../services/registration/registration.service");
const { createSessionInRedis } = require("../services/session.service");
const catchAsync = require("../utils/catchAsync");
const { setAuthCookies, generateTokens } = require("../utils/auth");

class RegistrationController {
  /**
   * STEP 1 — Submit Email
   */
  startRegistration = catchAsync(async (req, res) => {
    const { email } = req.body;

    const response = await RegistrationService.startRegistrationByEmail(email);
    return res.status(200).json({
      success: true,
      data: response,
    });
  });

  /**
   * STEP 2 — Select Role/Intent
   */
  setSignupIntent = catchAsync(async (req, res) => {
    const { sessionId, intent } = req.body;
    const response = await RegistrationService.setRegistrationSignupIntent(
      sessionId,
      intent,
    );
    return res.status(200).json({
      success: true,
      data: response,
    });
  });

  /**
   * STEP 3 — Personal Info
   */
  submitPersonalInfo = catchAsync(async (req, res) => {
    const { sessionId, personalInfo } = req.body;

    const response = await RegistrationService.completePersonalInfo(
      sessionId,
      personalInfo,
    );

    return res.status(200).json({
      success: true,
      data: response,
    });
  });

  /**
   * STEP 4 — Send OTP
   */
  sendOtp = catchAsync(async (req, res) => {
    const { sessionId } = req.body;

    const response = await RegistrationService.sendOtp(sessionId);

    return res.status(200).json({
      success: true,
      data: response,
    });
  });

  /**
   * STEP 5 — Verify OTP + Create User/Seller
   */
  verifyOtp = catchAsync(async (req, res) => {
    const { sessionId, otp } = req.body;

    const { user, accountType } = await RegistrationService.verifyOtp(
      sessionId,
      otp,
    );

    const { accessToken, refreshToken, jti } = generateTokens(
      user.id,
      user.role,
    );

    await createSessionInRedis(user, refreshToken, jti);

    // Set cookies
    setAuthCookies(res, accessToken, refreshToken);
    return res.status(201).json({
      success: true,
      message: "Registration completed",
      data: { accountType },
    });
  });

  // get session
  getSession = catchAsync(async (req, res) => {
    const { sessionId } = req.params;

    const session = await RegistrationService.getSession(sessionId);

    return res.status(200).json({
      success: true,
      message: "Session retrieved successfully",
      data: session,
    });
  });
}

module.exports = new RegistrationController();
