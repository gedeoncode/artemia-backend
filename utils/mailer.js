const nodemailer = require("nodemailer");
const { html } = require("common-tags");

// === Email Transporter Setup ===
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  pool: true,
  maxConnections: 5,
  rateDelta: 1000,
  maxMessages: 10,
});

// === Email Validation Helper ===
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// === Generic Email Sender ===
const sendEmail = async ({ to, subject, htmlBody, highPriority = false }) => {
  if (!isValidEmail(to)) throw new Error("Invalid recipient email address");
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

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(
      `Email sent to ${to.substring(0, 3)}...@...${to.split("@")[1]}`
    );
    return {
      success: true,
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
    };
  } catch (error) {
    console.error("Error sending email:", {
      error: error.message,
      recipient: to.substring(0, 3) + "...",
    });
    throw new Error("Failed to send email. Please try again later.");
  }
};

// === OTP Email Sender (with rate limiting) ===
const generateOtpEmailTemplate = (otp, expiryMinutes = 5) => html`
  <div
    style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"
  >
    <h2 style="color: #2c3e50;">Votre code de vérification Artemia</h2>
    <p>Bonjour,</p>
    <p>Voici votre code de vérification à usage unique :</p>
    <div style="font-size: 24px; font-weight: bold; color: #3498db;">
      ${otp}
    </div>
    <p>Ce code est valable pendant ${expiryMinutes} minutes.</p>
    <p>
      Si vous n'êtes pas à l'origine de cette demande, veuillez ignorer cet
      e-mail.
    </p>
    <p>— L'équipe Artemia</p>
  </div>
`;

const rateLimitedSendOtpEmail = (() => {
  const lastSent = new Map();
  const RATE_LIMIT_MS = 60 * 1000; // 1 minute

  return async (to, otp, expiryMinutes = 5) => {
    const now = Date.now();
    if (lastSent.has(to) && now - lastSent.get(to) < RATE_LIMIT_MS) {
      throw new Error("Veuillez patienter avant de demander un nouveau code.");
    }

    lastSent.set(to, now);

    return sendEmail({
      to,
      subject: "Votre code de vérification Artemia",
      htmlBody: generateOtpEmailTemplate(otp, expiryMinutes),
      highPriority: true,
    });
  };
})();

module.exports = {
  sendEmail, // Use this for general emails (submissions, marketing, etc.)
  sendOtpEmail: rateLimitedSendOtpEmail, // OTP-specific with rate limiting
  _sendOtpEmailUnwrapped: async (to, otp, expiryMinutes) => {
    // For testing or internal use without rate limiting
    return sendEmail({
      to,
      subject: "Votre code de vérification Artemia",
      htmlBody: generateOtpEmailTemplate(otp, expiryMinutes),
      highPriority: true,
    });
  },
};
