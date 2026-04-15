const nodemailer = require("nodemailer");

/**
 * Create a reusable transporter.
 * Defaults to Gmail; override via EMAIL_HOST/EMAIL_PORT env vars.
 */
function createTransporter() {
  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
}

/**
 * Send a password reset email with a link containing the reset token.
 */
async function sendResetEmail(toEmail, resetToken) {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const resetLink = `${frontendUrl}/reset-password/${resetToken}`;

  const transporter = createTransporter();

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
