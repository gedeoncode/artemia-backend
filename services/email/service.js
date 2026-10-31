const emailQueue = require("./queue");
const { nanoid } = require("nanoid");
const transporter = require("./transporter");
const { checkOtpLimit } = require("./rateLimiter");
const { validateEmail } = require("../../validators/validate.inputs");

const emailService = {
  // Queue-based email sending
  sendEmail: async ({ to, type, data, highPriority = false }) => {
    return emailQueue.add(
      { type, data, to, highPriority },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
        removeOnComplete: true,
      }
    );
  },

  // OTP emails with rate limiting
  sendOtpEmail: async (to, otp, expiryMinutes = 5, locale = "fr") => {
    checkOtpLimit(to);
    return emailQueue.add(
      {
        type: "OTP",
        data: { otp, expiryMinutes, locale },
        to,
        highPriority: true,
      },
      {
        attempts: 5,
        backoff: { type: "exponential", delay: 2000 },
        priority: 1,
        jobId: `otp_${nanoid()}`,
        removeOnComplete: true,
      }
    );
  },

  // Direct send (bypasses queue)
  _sendDirect: async ({ to, subject, htmlBody, highPriority = false }) => {
    const {isValid, errors} = validateEmail(to);
    if (!isValid) throw new Error(errors.join(" "));
    if (!subject || !htmlBody)
      throw new Error("Missing subject or email content");

    const mailOptions = {
      from: `"Artemia" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: htmlBody,
      replyTo: process.env.EMAIL_REPLY_TO || "no-reply@artemia.com",
      headers: {
        "X-Mailer": "Artemia Mailer",
        ...(highPriority && { "X-Priority": "1" }),
      },
      dkim: process.env.DKIM_PRIVATE_KEY
        ? {
            domainName: process.env.DOMAIN_NAME,
            keySelector: process.env.DKIM_SELECTOR || "default",
            privateKey: process.env.DKIM_PRIVATE_KEY,
          }
        : undefined,
    };

    return transporter.sendMail(mailOptions);
  },
};

module.exports = emailService;
