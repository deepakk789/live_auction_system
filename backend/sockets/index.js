const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");
const { registerOnlineAuctionEvents } = require("./onlineAuction");
const { registerOfflineAuctionEvents } = require("./offlineAuction");

/**
 * Initialize Socket.IO with:
 *  - Optional JWT authentication middleware (graceful — unauthenticated sockets still connect)
 *  - Room management (join/leave auction rooms, global user rooms)
 *  - Delegated event handlers for online and offline auction modes
 */
const initSockets = (io) => {
  // ── Socket JWT auth middleware ─────────────────────────────────
  // Attaches socket.user if a valid token is provided.
  // Anonymous sockets (viewers, etc.) are still allowed to connect.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded; // { userId, username }
        logger.debug(`Socket authenticated: ${socket.id} as ${decoded.username}`);
      } catch {
        logger.warn(`Socket connected with invalid token: ${socket.id}`);
      }
    }
    next(); // Always allow connection
  });

  io.on("connection", (socket) => {
    logger.debug(`Client connected: ${socket.id}${socket.user ? ` (${socket.user.username})` : " (anonymous)"}`);

    // ── Room management ──────────────────────────────────────────
    socket.on("join_auction", ({ auctionId }) => {
      if (!auctionId) return;
      socket.join(`auction_${auctionId}`);
      logger.debug(`Socket ${socket.id} joined room auction_${auctionId}`);
    });

    socket.on("leave_auction", ({ auctionId }) => {
      if (!auctionId) return;
      socket.leave(`auction_${auctionId}`);
      logger.debug(`Socket ${socket.id} left room auction_${auctionId}`);
    });

    // Global user room for personal notifications (auction invites, etc.)
    socket.on("join_global", ({ userId }) => {
      if (!userId) return;
      socket.join(`user_${userId}`);
    });

    // Manager notification relay
    socket.on("notify_managers", ({ managerIds, auctionId, message }) => {
      if (managerIds && managerIds.length) {
        managerIds.forEach(id => {
          io.to(`user_${id}`).emit("auction_notification", { auctionId, message });
        });
      }
    });

    // Team quit notification relay
    socket.on("team_quit_request", ({ auctionId, teamName }) => {
      if (auctionId) {
        socket.to(`auction_${auctionId}`).emit("team_quit_alert", { teamName });
      }
    });

    // ── Delegate to mode-specific handlers ──────────────────────
    registerOnlineAuctionEvents(io, socket);
    registerOfflineAuctionEvents(io, socket);

    socket.on("disconnect", () => {
      logger.debug(`Client disconnected: ${socket.id}`);
    });
  });
};

module.exports = { initSockets };
