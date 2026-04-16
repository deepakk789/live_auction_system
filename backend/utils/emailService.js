const nodemailer = require("nodemailer");

/**
 * Create a reusable transporter.
 * Defaults to Gmail; override via EMAIL_HOST/EMAIL_PORT env vars.
 */
function createTransporter() {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  // Guard: if email credentials aren't configured, warn and return null
  if (!emailUser || !emailPass || emailUser === "your-email@gmail.com") {
    console.warn("⚠️  Email service not configured — skipping email send. Set EMAIL_USER and EMAIL_PASS in .env");
    return null;
  }

  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail",
    auth: {
      user: emailUser,
      pass: emailPass
    }
  });
}

/**
 * Send a password reset email with a link containing the reset token.
 */
async function sendResetEmail(toEmail, resetToken) {
  const transporter = createTransporter();

  if (!transporter) {
    console.warn(`📧 Password reset requested for ${toEmail}. Reset token: ${resetToken}`);
    console.warn(`   (Email not sent — configure EMAIL_USER/EMAIL_PASS in .env to enable)`);
    return; // Don't throw — gracefully skip
  }

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const resetLink = `${frontendUrl}/reset-password/${resetToken}`;

  const mailOptions = {
    from: `"AuctionX" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "AuctionX — Password Reset Request",
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0b132b; color: #e2e8f0; padding: 40px; border-radius: 16px;">
        <h1 style="color: #60a5fa; margin-bottom: 20px;">🔐 Password Reset</h1>
        <p style="font-size: 16px; line-height: 1.6;">
          You requested a password reset for your AuctionX account. Click the button below to set a new password:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="
            display: inline-block;
            background: linear-gradient(135deg, #2563eb, #9333ea);
            color: white;
            padding: 14px 32px;
            border-radius: 12px;
            text-decoration: none;
            font-weight: bold;
            font-size: 16px;
            box-shadow: 0 4px 15px rgba(126, 34, 206, 0.4);
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
    `
  };

  await transporter.sendMail(mailOptions);
}

module.exports = { sendResetEmail };
