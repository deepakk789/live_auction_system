const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const { protect } = require("../middleware/authMiddleware");
const { sendResetEmail } = require("../utils/emailService");

// It's good practice to have a JWT_SECRET in env, otherwise fallback for local dev
const JWT_SECRET = process.env.JWT_SECRET || "supersecretauctionkey2026";

// Email format validator
function isValidEmail(email) {
  return /^\S+@\S+\.\S+$/.test(email);
}

// REGISTER
router.post("/register", async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: "Please provide all required fields." });
    }

    if (username.trim().length < 3) {
      return res.status(400).json({ error: "Username must be at least 3 characters." });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    // Check if user exists
    const existingUser = await User.findOne({ 
      $or: [{ email: email.toLowerCase() }, { username: username.trim() }] 
    });

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        return res.status(400).json({ error: "An account with this email already exists." });
      }
      return res.status(400).json({ error: "This username is already taken." });
    }

    // Create user (password hashed via pre-save hook)
    const user = new User({ 
      username: username.trim(), 
      email: email.toLowerCase().trim(), 
      password 
    });
    await user.save();

    // Generate Token
    const token = jwt.sign(
      { userId: user._id, username: user.username }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.status(201).json({ 
      message: "Registration successful", 
      token, 
      user: { id: user._id, username: user.username, email: user.email } 
    });
  } catch (error) {
    console.error("Register Error:", error);

    // Handle Mongoose duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        error: `An account with this ${field} already exists.` 
      });
    }

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ error: messages[0] });
    }

    next(error);
  }
});

// LOGIN
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Please provide email and password." });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }

    // Find User by email only
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ error: "No account found with this email." });
    }

    // Compare Password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Incorrect password. Please try again." });
    }

    // Generate Token
    const token = jwt.sign(
      { userId: user._id, username: user.username }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.json({
      message: "Login successful",
      token,
      user: { id: user._id, username: user.username, email: user.email }
    });

  } catch (error) {
    console.error("Login Error:", error);
    next(error);
  }
});

// GET CURRENT USER (auto-login / token validation)
router.get("/me", protect, async (req, res, next) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        username: req.user.username,
        email: req.user.email
      }
    });
  } catch (error) {
    console.error("Me Error:", error);
    next(error);
  }
});

// FORGOT PASSWORD — sends reset email
router.post("/forgot-password", async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Please provide your email address." });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      // Don't reveal whether user exists — always show success
      return res.json({ message: "If an account with that email exists, a reset link has been sent." });
    }

    // Generate token
    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Send email
    try {
      await sendResetEmail(user.email, resetToken);
    } catch (emailErr) {
      console.error("Email send error:", emailErr.message);
      // Don't fail the request — token is saved; user can retry
    }

    res.json({ message: "If an account with that email exists, a reset link has been sent." });

  } catch (error) {
    console.error("Forgot Password Error:", error);
    next(error);
  }
});

// RESET PASSWORD — validates token and updates password
router.post("/reset-password", async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: "Token and new password are required." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired reset token. Please request a new one." });
    }

    user.password = newPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({ message: "Password reset successful. You can now sign in." });

  } catch (error) {
    console.error("Reset Password Error:", error);
    next(error);
  }
});

module.exports = router;
