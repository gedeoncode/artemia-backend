const transporter = require("./transporter");
const templates = require("./templates");
const { validateEmail } = require("../../validators/validate.inputs");

module.exports = async function (job) {
  const { type, data, to, highPriority } = job.data;
    const { isValid, errors } = validateEmail(to);

  if (!isValid) {
    console.error(`Invalid email address: ${to}. Errors: ${errors.join(" ")}`);
    throw new Error("Invalid recipient email address");
  }

  const template = templates[type](...Object.values(data));

  const mailOptions = {
    from: `"Artemia" <${process.env.EMAIL_USER}>`,
    to,
    subject: template.subject,
    html: template.html,
    replyTo: process.env.EMAIL_REPLY_TO || "no-reply@artemia.com",
    headers: {
      "X-Mailer": "Artemia Mailer",
      ...(highPriority && { "X-Priority": "1" }),
      "X-Email-Type": type,
      "X-Email-ID": job.id,
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
    return info;
  } catch (error) {
    console.error("Email sending failed:", {
      error: error.message,
      recipient: to,
      type,
      jobId: job.id,
    });
    throw error; // triggers retry
  }
};
