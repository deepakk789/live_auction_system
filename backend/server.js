require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { Server } = require("socket.io");

const auctionRoutes = require("./routes/auctionRoutes");
const authRoutes = require("./routes/auth");
const { initSockets } = require("./sockets");
const logger = require("./utils/logger");

// ── App & Server Setup ────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

// ── Security Middleware ───────────────────────────────────────────────
app.use(helmet());

// CORS — restrict to known frontend origin in production
const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:5173";
app.use(cors({ origin: allowedOrigin, credentials: true }));

// Global rate limit — 100 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests from this IP, please try again later." },
});
app.use("/api/", globalLimiter);

// Stricter limit on auth endpoints to prevent brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many auth attempts. Please try again in 15 minutes." },
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);

// Body parser
app.use(express.json({ limit: "50mb" }));

// ── Socket.IO ─────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: allowedOrigin, credentials: true },
});

// Make io accessible to route controllers via req.app.get("io")
app.set("io", io);

// Delegate all socket logic to sockets/index.js
initSockets(io);

// ── Database ──────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => logger.info("✅ MongoDB connected"))
  .catch((err) => logger.error(`❌ MongoDB connection error: ${err.message}`));

// ── Routes ────────────────────────────────────────────────────────────
// Health check — verify backend is reachable
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Root route — friendly landing page for anyone who hits the API URL directly
app.get("/", (req, res) => {
  res.send(`
    <div style="font-family: sans-serif; padding: 40px; text-align: center; background: #0b1120; color: white; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center;">
      <h1 style="color: #3b82f6; font-size: 2.5rem;">⚡ AuctionX API</h1>
      <p style="color: #94a3b8; font-size: 1.1rem;">Backend is live and running successfully.</p>
      <p style="color: #475569; font-size: 0.9rem; margin-top: 10px;">Visit the frontend URL to use the application.</p>
      <code style="color: #60a5fa; background: #1e293b; padding: 8px 16px; border-radius: 6px; margin-top: 20px;">GET /api/health — check server status</code>
    </div>
  `);
});

app.use("/api/auction", auctionRoutes);
app.use("/api/auth", authRoutes);

// ── Global Error Handler ──────────────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.stack || err.message}`);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

// ── Start Server ──────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`🚀 Server running on http://localhost:${PORT}`);
  logger.info(`   Health: http://localhost:${PORT}/api/health`);
  logger.info(`   Environment: ${process.env.NODE_ENV || "development"}`);
  logger.info(`   CORS allowed origin: ${allowedOrigin}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    logger.error(`❌ Port ${PORT} is already in use. Please close the conflicting process.`);
    process.exit(1);
  } else {
    logger.error(`❌ Server runtime error: ${err.message}`);
  }
});

// Export app and server for testing (used by supertest in tests/)
module.exports = { app, server };
