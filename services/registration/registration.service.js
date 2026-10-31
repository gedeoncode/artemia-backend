const User = require("../../models/User.model");
const Seller = require("../../models/Seller.model");
const RegistrationSession = require("../../models/RegistrationSession.model");
const { generateOTP } = require("../../utils/generateOtp");
const emailService = require("../email");
const { AppError } = require("../../utils/AppError");
const { validateObjectId } = require("../../validators/validate.id");
const mongoose = require("mongoose");
const { OTP_RESEND_COOLDOWN_MS, OTP_RESEND_COOLDOWN_SECONDS } = require("./constants");

class RegistrationService {
  /**
   * STEP 1 — Start registration with email
   */
  async startRegistrationByEmail(email) {
    const existing = await User.findOne({ email });
    if (existing)
      throw new AppError(
        "Email already in use",
        400,
        "REGISTRATION_EMAIL_EXISTS",
      );
    // Delete any old session for  this email
    await RegistrationSession.deleteMany({ email });
    const session = await RegistrationSession.create({
      email,
      currentStep: "SIGNUP_INTENT",
    });
    return {
      sessionId: session._id,
      nextStep: "SIGNUP_INTENT",
    };
  }
  /**
   * STEP 2 — Set role/intent
   */
  async setRegistrationSignupIntent(sessionId, intent) {
    const session = await RegistrationSession.findById(sessionId);
    if (!session)
      throw new AppError("Session not found", 404, "SESSION_MISSING");

    if (session.isCompleted)
      throw new AppError(
        "Registration already completed",
        400,
        "REGISTRATION_COMPLETED",
      );
    if (session.currentStep !== "SIGNUP_INTENT")
      throw new AppError(
        "You must complete previous step",
        400,
        "INVALID_STEP",
      );

    if (!["BECOME_SELLER", "BROWSE"].includes(intent))
      throw new AppError("Invalid intent selected", 400, "INTENT_MISSING");
    session.signupIntent = intent;
    session.currentStep = "PERSONAL_INFO";
    await session.save();

    return { sessionId: session._id, nextStep: "PERSONAL_INFO" };
  }

  /**
   * STEP 3 — Save personal info
   */
  async completePersonalInfo(sessionId, personalInfo) {
    const session = await RegistrationSession.findById(sessionId);

    if (!session) {
      throw new AppError(
        "Registration session not found",
        404,
        "SESSION_MISSING",
      );
    }

    if (session.currentStep !== "PERSONAL_INFO") {
      throw new AppError(
        `Invalid registration step. Expected PERSONAL_INFO, got ${session.currentStep}`,
        400,
        "INVALID_STEP",
      );
    }

    const { name, phone, password } = personalInfo;

    // ---- Basic input sanity (fast fail) ----
    if (!name || !phone || !password) {
      throw new AppError(
        "Missing required personal information",
        400,
        "PERSONAL_INFO_MISSING",
      );
    }

    // Normalize phone (IMPORTANT for uniqueness)
    const normalizedPhone = phone.trim();
    if (!/^\+?\d{9,15}$/.test(normalizedPhone)) {
      throw new AppError("Invalid phone number format", 400, "PHONE_INVALID");
    }

    // ---- UX pre-check (not relied on for safety) ----
    const existingUser = await User.findOne({ phone: normalizedPhone }).lean();
    if (existingUser) {
      throw new AppError(
        "Phone number already registered",
        409,
        "PHONE_ALREADY_REGISTERED",
      );
    }

    // ---- Store sensitive data safely in session ----

    session.personalInfo = {
      name: name.trim(),
      phone: normalizedPhone,
      password: password.trim(),
    };

    // ---- Advance flow ----
    session.currentStep = "OTP";

    try {
      await session.save();
    } catch (err) {
      // ---- Race condition safety (duplicate phone) ----
      if (err.code === 11000 && err.keyValue?.phone) {
        throw new AppError("Phone number already registered", 409, {
          code: "PHONE_ALREADY_REGISTERED",
        });
      }

      throw err;
    }

    return {
      sessionId: session._id,
      nextStep: session.currentStep,
    };
  }

  /**
   * STEP 5 — Send OTP
   */
  async sendOtp(sessionId) {
    if (!validateObjectId(sessionId)) {
      throw new AppError("Invalid session ID.", 404, "INVALID_SESSION");
    }

    const session = await RegistrationSession.findById(sessionId).select(
      "+otpAttempts +otpCode +otpExpires",
    );
    // console.log("Session:", session)
    if (!session)
      throw new AppError("Session not found", 404, "INVALID_SESSION");

    if (session.currentStep !== "OTP")
      throw new AppError("You cannot request OTP yet", 400, "CANNOT_SEND_OTP");

    // Rate limit OTP requests
    if (session.lastOtpSent) {
      const elapsed = Date.now() - session.lastOtpSent.getTime();

      if (elapsed < OTP_RESEND_COOLDOWN_MS) {
        const retryAfter = Math.ceil((OTP_RESEND_COOLDOWN_MS - elapsed) / 1000);

        throw new AppError(
          "Please wait before requesting another OTP",
          429,
          "WAIT_ANOTHER_OTP",
          {
            retryAfter,
          },
        );
      }
    }

    const otp = generateOTP();
    session.setOtp(otp);
    await session.save();
    await emailService.sendOtpEmail(session.email, otp);
    return { message: "OTP sent",
      retryAfter: OTP_RESEND_COOLDOWN_SECONDS
     };
  }

  /**
   * STEP 6 — Verify OTP and create final account
   */
  async verifyOtp(sessionId, otp) {
    const session = await RegistrationSession.findById(sessionId).select(
      "+otpAttempts +otpCode +otpExpires +passwordHash +personalInfo",
    );

    if (!session) {
      throw new AppError(
        "Invalid registration session",
        404,
        "INVALID_SESSION",
      );
    }
    if (session.currentStep !== "OTP") {
      console.log("Current step:", session.currentStep);
      throw new AppError(
        "OTP verification is not allowed at this step",
        400,
        "OTP_NOT_ALLOWED",
      );
    }

    if (session.otpAttempts >= 5) {
      throw new AppError(
        "Maximum OTP attempts exceeded. Restart the registration process.",
        429,
        "MAXIMUM_OTP_ATTEMPTS",
      );
    }

    const isValid = session.verifyOtp(otp);
    if (!isValid) {
      session.otpAttempts = (session.otpAttempts || 0) + 1;
      await session.save();
      throw new AppError("Invalid OTP", 400, "INVALID_OTP");
    }

    const tx = await mongoose.startSession();
    tx.startTransaction();

    try {
      // ----- Create Base User Only -----
      const isSeller = session.signupIntent === "BECOME_SELLER";
      const [user] = await User.create(
        [
          {
            email: session.email,
            phone: session.personalInfo.get("phone"),
            name: session.personalInfo.get("name"),
            password: session.personalInfo.get("password"),
            isEmailVerified: true,
            signupIntent: session.signupIntent, // preserved for onboarding
            role: isSeller ? "seller" : "user",
          },
        ],
        { session: tx },
      );
      if (isSeller) {
        await Seller.create(
          [
            {
              user: user._id,
            },
          ],
          { session: tx },
        );
      }
      // ----- Finalize Registration Session -----
      session.set({
        currentStep: "COMPLETED",
        isCompleted: true,
        otpCode: undefined,
        otpExpires: undefined,
        otpAttempts: 0,
      });

      await session.save({ session: tx });
      await tx.commitTransaction();
      // ----- Frontend-safe response -----
      return {
        status: "success",
        accountType: session.signupIntent,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role,
          signupIntent: user.signupIntent,
        },
      };
    } catch (error) {
      await tx.abortTransaction();
      throw new AppError(
        "Registration failed, please try again",
        500,
        "REGISTRATION_FAILED",
      );
    } finally {
      tx.endSession();
    }
  }

  // get session
  async getSession(sessionId) {
    if (!validateObjectId(sessionId)) {
      throw new AppError("Invalid session ID", 400, "INVALID_SESSION");
    }

    const session = await RegistrationSession.findById(sessionId)
      .select("email currentStep signupIntent isCompleted")
      .lean();

    if (!session) {
      throw new AppError(
        "Registration session not found",
        404,
        "INVALID_SESSION",
      );
    }
    if (session.isCompleted) {
      return {
        sessionId: session._id,
        currentStep: "COMPLETED",
        isCompleted: true,
      };
    }

    return {
      sessionId: session._id,
      email: session.email,
      currentStep: session.currentStep,
      intent: session.signupIntent,
      isCompleted: session.isCompleted,
    };
  }
}

module.exports = new RegistrationService();
