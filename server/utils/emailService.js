// server/utils/emailService.js
const nodemailer = require("nodemailer");

// Read env vars once
const {
  EMAIL,
  EMAIL_PASS,
  EMAIL_HOST,
  EMAIL_PORT,
  EMAIL_FROM_NAME,
  NODE_ENV,
} = process.env;

// Basic config validation (don't crash, just log + fail calls gracefully)
if (!EMAIL || !EMAIL_PASS) {
  console.error(
    "⚠️ Email service: EMAIL or EMAIL_PASS is not set. sendEmail() will fail until these are configured."
  );
}

// Create reusable transporter
const port = EMAIL_PORT ? Number(EMAIL_PORT) : 465;
const transporter = nodemailer.createTransport({
  host: EMAIL_HOST || "smtp.gmail.com",
  port,
  secure: port === 465, // true for 465, false for 587 / others
  auth: {
    user: EMAIL,
    pass: EMAIL_PASS,
  },
  tls: {
    // In dev you can relax TLS a bit if needed; in prod keep strict
    rejectUnauthorized: NODE_ENV === "production",
  },
});

/**
 * Send an email
 * @param {string|string[]} to
 * @param {string} subject
 * @param {string} [text]
 * @param {string} [html]
 * @returns {Promise<{success:boolean, messageId?:string, error?:string}>}
 */
async function sendEmail(to, subject, text, html) {
  // If not configured, fail fast without throwing
  if (!EMAIL || !EMAIL_PASS) {
    return {
      success: false,
      error: "Email service not configured (EMAIL/EMAIL_PASS missing)",
    };
  }

  try {
    const fromName = EMAIL_FROM_NAME || "Thriftkart";
    const info = await transporter.sendMail({
      from: `"${fromName}" <${EMAIL}>`,
      to,
      subject,
      text,
      html,
    });

    // In non-prod, you can log the messageId for debugging
    if (NODE_ENV !== "production") {
      console.log("📧 Email sent:", info.messageId);
    }

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Error sending email:", error);
    return { success: false, error: error.message };
  }
}

module.exports = { sendEmail };
