const nodemailer = require("nodemailer");

/** Check whether the credential looks like a real value vs. a placeholder */
function isPlaceholder(value) {
  if (!value) return true;
  const lower = value.toLowerCase();
  return (
    lower.includes("your-") ||
    lower.includes("your_") ||
    lower.includes("replace_") ||
    lower === "your-email@gmail.com" ||
    lower === "your_gmail_address@gmail.com" ||
    lower === "your-app-password" ||
    lower === "your_gmail_app_password_here"
  );
}

function createTransporter() {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (isPlaceholder(emailUser) || isPlaceholder(emailPass)) {
    console.warn("⚠️  Email service not configured — set EMAIL_USER and EMAIL_PASS in environment variables");
    return null;
  }

  // Render.com blocks port 465 (SSL) but allows port 587 (STARTTLS).
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: parseInt(process.env.EMAIL_PORT || "587", 10),
    secure: false,
    auth: {
      user: emailUser,
      pass: emailPass,
    },
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

/**
 * Send a password reset email.
 * @returns {{ sent: boolean, reason?: string }}
 */
async function sendResetEmail(toEmail, resetToken) {
  const transporter = createTransporter();
  const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
  const resetLink = `${frontendUrl}/reset-password/${resetToken}`;

  if (!transporter) {
    console.warn(`📧 [DEV] Password reset link for ${toEmail}:`);
    console.warn(`   ${resetLink}`);
    console.warn("   (Email not sent — configure EMAIL_USER/EMAIL_PASS to enable SMTP)");
    return { sent: false, reason: "not_configured" };
  }

  const mailOptions = {
    from: `"AuctionX" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "AuctionX — Password Reset Request",
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #080d14; color: #e2e8f0; padding: 40px; border-radius: 16px;">
        <h1 style="color: #10b981; margin-bottom: 20px;">🔐 Password Reset</h1>
        <p style="font-size: 16px; line-height: 1.6;">
          You requested a password reset for your AuctionX account. Click the button below to set a new password:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="
            display: inline-block;
            background: linear-gradient(135deg, #059669, #10b981);
            color: white;
            padding: 14px 32px;
            border-radius: 12px;
            text-decoration: none;
            font-weight: bold;
            font-size: 16px;
            box-shadow: 0 4px 15px rgba(16, 185, 129, 0.35);
          ">
            Reset Password
          </a>
        </div>
        <p style="font-size: 14px; color: #9ca3af;">
          This link will expire in <strong>1 hour</strong>. If you didn't request this, you can safely ignore this email.
        </p>
        <hr style="border: 1px solid #1f2937; margin: 30px 0;" />
        <p style="font-size: 12px; color: #6b7280; text-align: center;">
          AuctionX — The Ultimate Auction Orchestration Platform
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
  console.log(`✅ Password reset email sent to ${toEmail}`);
  return { sent: true };
}

module.exports = { sendResetEmail, createTransporter };
