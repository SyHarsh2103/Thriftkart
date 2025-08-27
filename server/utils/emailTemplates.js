// utils/emailTemplates.js
function baseHtml({ appName, title, preheader, body, footer }) {
    // Preheader is hidden preview text in most email clients
    const preheaderText =
      preheader ||
      "Use the one-time code below to continue. This code expires soon.";
  
    return `<!doctype html>
  <html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta name="color-scheme" content="light only" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      /* Basic reset */
      body,table,td,a { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; }
      body { margin:0; padding:0; background:#f6f7fb; color:#111827; }
      a { text-decoration:none; }
  
      .container { max-width: 640px; margin: 0 auto; padding: 24px 16px; }
      .card {
        background:#ffffff;
        border-radius:16px;
        padding: 32px 28px;
        box-shadow: 0 6px 24px rgba(0,0,0,0.06);
      }
      .brand { font-size: 18px; font-weight: 700; color:#111827; letter-spacing: 0.2px; }
      .title { font-size: 20px; font-weight: 700; margin: 12px 0 4px; }
      .muted { color:#6b7280; font-size: 14px; }
      .otp {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
        font-size: 28px;
        letter-spacing: 6px;
        font-weight: 700;
        background:#f3f4f6;
        color:#111827;
        border-radius: 12px;
        padding: 14px 18px;
        display:inline-block;
        margin: 12px 0 8px;
      }
      .btn {
        display:inline-block;
        margin-top: 16px;
        padding: 12px 18px;
        border-radius: 12px;
        background:#111827;
        color:#ffffff !important;
        font-weight: 600;
        font-size: 14px;
      }
      .hr { border:none; border-top:1px solid #e5e7eb; margin: 24px 0; }
      .small { color:#6b7280; font-size:12px; line-height:1.5; }
      .footer { text-align:center; color:#9ca3af; font-size:12px; margin-top:16px; }
      .preheader { display:none!important; visibility:hidden; opacity:0; color:transparent; height:0; width:0; overflow:hidden; }
    </style>
  </head>
  <body>
    <div class="preheader">${preheaderText}</div>
    <div class="container">
      <div class="card">
        <div class="brand">${appName}</div>
        ${body}
        <hr class="hr" />
        <div class="small">${footer}</div>
      </div>
      <div class="footer">
        © ${new Date().getFullYear()} ${appName}. All rights reserved.
      </div>
    </div>
  </body>
  </html>`;
  }
  
  function textFallback({ greeting, instructions, otp, expiresInMinutes, actionUrl, supportEmail }) {
    const lines = [
      greeting,
      "",
      instructions,
      "",
      `Your code: ${otp}`,
      `This code expires in ${expiresInMinutes} minutes.`,
    ];
    if (actionUrl) lines.push("", `Open: ${actionUrl}`);
    lines.push(
      "",
      "If you didn't request this, you can safely ignore this email.",
      supportEmail ? `Need help? Contact us at ${supportEmail}.` : ""
    );
    return lines.filter(Boolean).join("\n");
  }
  
  function subjectLine({ appName, purpose, otp, expiresInMinutes, includeOtpInSubject = true }) {
    // Many brands include the OTP in the subject for convenience. If you prefer not to,
    // set includeOtpInSubject to false.
    if (includeOtpInSubject) {
      return `[${appName}] ${purpose} — OTP ${otp} (valid ${expiresInMinutes} min)`;
    }
    return `[${appName}] ${purpose} (valid ${expiresInMinutes} min)`;
  }
  
  function buildAccountVerificationEmail({
    appName = "Thriftkart",
    userName = "there",
    otp,
    expiresInMinutes = 10,
    actionUrl = process.env.CLIENT_APP_URL || "https://thriftkart.com",
    supportEmail = "support@thriftkart.com",
    includeOtpInSubject = true,
  } = {}) {
    const purpose = "Verify your email";
    const subject = subjectLine({ appName, purpose, otp, expiresInMinutes, includeOtpInSubject });
  
    const greeting = `Hi ${userName},`;
    const instructions =
      `Use the one-time code below to verify your ${appName} account.`;
  
    const html = baseHtml({
      appName,
      title: purpose,
      preheader: `Use code ${otp}. Expires in ${expiresInMinutes} minutes.`,
      body: `
        <h1 class="title">${purpose}</h1>
        <p class="muted">${greeting}</p>
        <p>${instructions}</p>
        <div class="otp" aria-label="Your verification code">${otp}</div>
        <p class="muted">This code expires in <strong>${expiresInMinutes} minutes</strong>.</p>
        ${actionUrl ? `<a class="btn" href="${actionUrl}" target="_blank" rel="noopener">Open ${appName}</a>` : ""}
      `,
      footer: `
        Never share this code with anyone. ${appName} will never ask you for your password or OTP.
        ${supportEmail ? ` Need help? Email <a href="mailto:${supportEmail}">${supportEmail}</a>.` : ""}
      `
    });
  
    const text = textFallback({
      greeting,
      instructions,
      otp,
      expiresInMinutes,
      actionUrl,
      supportEmail
    });
  
    return { subject, text, html };
  }
  
  function buildPasswordResetOtpEmail({
    appName = "Thriftkart",
    userName = "there",
    otp,
    expiresInMinutes = 10,
    actionUrl = process.env.CLIENT_APP_URL || "https://thriftkart.com/login",
    supportEmail = "support@thriftkart.com",
    includeOtpInSubject = true,
  } = {}) {
    const purpose = "Password reset code";
    const subject = subjectLine({ appName, purpose, otp, expiresInMinutes, includeOtpInSubject });
  
    const greeting = `Hi ${userName},`;
    const instructions =
      `Use the one-time code below to reset your ${appName} password.`;
  
    const html = baseHtml({
      appName,
      title: purpose,
      preheader: `Use code ${otp}. Expires in ${expiresInMinutes} minutes.`,
      body: `
        <h1 class="title">${purpose}</h1>
        <p class="muted">${greeting}</p>
        <p>${instructions}</p>
        <div class="otp" aria-label="Your password reset code">${otp}</div>
        <p class="muted">This code expires in <strong>${expiresInMinutes} minutes</strong>.</p>
        ${actionUrl ? `<a class="btn" href="${actionUrl}" target="_blank" rel="noopener">Continue to ${appName}</a>` : ""}
      `,
      footer: `
        If you didn’t request a password reset, you can ignore this email.
        Your account remains secure. ${supportEmail ? `Questions? <a href="mailto:${supportEmail}">${supportEmail}</a>.` : ""}
      `
    });
  
    const text = textFallback({
      greeting,
      instructions,
      otp,
      expiresInMinutes,
      actionUrl,
      supportEmail
    });
  
    return { subject, text, html };
  }
  
  module.exports = {
    buildAccountVerificationEmail,
    buildPasswordResetOtpEmail,
  };
  