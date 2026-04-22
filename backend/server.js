require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const auctionRoutes = require("./routes/auctionRoutes");
const authRoutes = require("./routes/auth");

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Make io accessible to all route controllers via req.app.get("io")
app.set("io", io);

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Health check endpoint — verify backend is reachable
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auction", auctionRoutes);
app.use("/api/auth", authRoutes);

// Global error handler (Express 5 compatible)
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.stack || err.message);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

// MongoDB Models
const Auction = require("./models/Auction");
const Player = require("./models/player");
const Team = require("./models/Team");

// Connect mapping: socket.id -> { auctionId, teamName }
const managerConnections = new Map();

// Socket events — ROOM-SCOPED for multi-auction support
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // Join an auction room
  socket.on("join_auction", ({ auctionId }) => {
    if (!auctionId) return;
    socket.join(`auction_${auctionId}`);
    console.log(`Socket ${socket.id} joined room auction_${auctionId}`);
  });

  // Leave an auction room
  socket.on("leave_auction", ({ auctionId }) => {
    if (!auctionId) return;
    socket.leave(`auction_${auctionId}`);
    console.log(`Socket ${socket.id} left room auction_${auctionId}`);
  });

  // Global user room for personal notifications
  socket.on("join_global", ({ userId }) => {
    if (!userId) return;
    socket.join(`user_${userId}`);
  });

  // 🔥 TEAM MANAGER LOBBY & NOTIFICATIONS
  socket.on("manager_join", ({ auctionId, teamName }) => {
    if (!auctionId || !teamName) return;
    managerConnections.set(socket.id, { auctionId, teamName });
    socket.to(`auction_${auctionId}`).emit("manager_status_change", { teamName, status: "Connected" });
  });

  socket.on("notify_managers", ({ managerIds, auctionId, message }) => {
    if (managerIds && managerIds.length) {
      managerIds.forEach(id => {
        io.to(`user_${id}`).emit("auction_notification", { auctionId, message });
      });
    }
  });

  socket.on("team_quit_request", ({ auctionId, teamName }) => {
    if (auctionId) {
      socket.to(`auction_${auctionId}`).emit("team_quit_alert", { teamName });
    }
  });

  // 🔥 FORWARD PLAYER UPDATES (scoped by auctionId)
  socket.on("auction_update", async (data) => {
    const room = data.auctionId ? `auction_${data.auctionId}` : null;

    if (room) {
      socket.to(room).emit("auction_update", data);
    } else {
      socket.broadcast.emit("auction_update", data);
    }

    // Async DB update
    try {
      if (data.auctionId) {
        await Auction.updateOne(
          { _id: data.auctionId },
          { currentPlayerIndex: data.currentIndex }
        );
      }
      if (data.players && data.players.length > 0) {
        const ops = data.players.map(p => ({
          updateOne: {
            filter: { index: p.index !== undefined ? p.index : p.id, ...(data.auctionId ? { auctionId: data.auctionId } : {}) },
            update: { $set: { status: p.status, currentBid: p.currentBid, soldTo: p.soldTo, soldPrice: p.soldPrice } }
          }
        }));
        await Player.bulkWrite(ops);
      }
    } catch (err) {
      console.error("DB Sync Error (auction_update):", err.message);
    }
  });

  // 🔥 FORWARD AUCTION STATE (scoped)
  socket.on("auction_state", async ({ auctionId, state }) => {
    if (auctionId) {
      socket.to(`auction_${auctionId}`).emit("auction_state", state);
      try {
        await Auction.updateOne({ _id: auctionId }, { state });
      } catch (err) {
        console.error(err);
      }
    } else {
      // Legacy fallback
      socket.broadcast.emit("auction_state", state);
    }
  });

  // 🔥 RECEIVE AUCTION CONFIG (scoped)
  socket.on("auction_config", async ({ auctionId, ...config }) => {
    if (auctionId) {
      socket.to(`auction_${auctionId}`).emit("auction_config", config);
      try {
        if (config.selectedFields) {
          await Auction.updateOne({ _id: auctionId }, { selectedFields: config.selectedFields });
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      socket.broadcast.emit("auction_config", config);
    }
  });

  // 🔥 RECEIVE TEAMS STATE (scoped)
  socket.on("teams_update", async ({ auctionId, teams }) => {
    if (auctionId) {
      socket.to(`auction_${auctionId}`).emit("teams_update", teams);
    } else {
      socket.broadcast.emit("teams_update", teams);
    }

    try {
      const teamData = teams || [];
      if (teamData.length > 0) {
        const ops = teamData.map(t => ({
          updateOne: {
            filter: { name: t.name, ...(auctionId ? { auctionId } : {}) },
            update: { $set: { budget: t.budget, players: t.players } },
            upsert: true
          }
        }));
        await Team.bulkWrite(ops);
      }
    } catch (err) {
      console.error(err);
    }
  });

  socket.on("max_bid_update", async ({ auctionId, value }) => {
    if (auctionId) {
      socket.to(`auction_${auctionId}`).emit("max_bid_update", value);
      try {
        await Auction.updateOne({ _id: auctionId }, { maxBid: value });
      } catch (err) {
        console.error(err);
      }
    } else {
      socket.broadcast.emit("max_bid_update", value);
    }
  });

  socket.on("sync_full_state", async ({ auctionId, playersState, auctionState, teamsState, auctionConfig }) => {
    console.log(`🔁 Full auction state synced from organizer for auction ${auctionId || "global"}`);
  });

  // 🔥 ORGANIZER LOCK STATE
  socket.on("organizer_lock_change", ({ auctionId, activeOrganizer }) => {
    if (auctionId) {
      socket.to(`auction_${auctionId}`).emit("organizer_lock_change", { activeOrganizer });
    }
  });

  // 🔥 VIEWER ONLINE BIDDING
  socket.on("viewer_bid", ({ auctionId, teamName, amount }) => {
    if (auctionId) {
      // Send to room, where the active OrganizerLive client will process it and update the master state
      io.to(`auction_${auctionId}`).emit("viewer_bid_received", { teamName, amount });
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
    const mConn = managerConnections.get(socket.id);
    if (mConn) {
      io.to(`auction_${mConn.auctionId}`).emit("manager_status_change", { teamName: mConn.teamName, status: "Offline" });
      managerConnections.delete(socket.id);
    }
  });
});


// Start server (ALWAYS LAST)
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} is already in use. Please close the conflicting process.`);
    process.exit(1);
  } else {
    console.error("❌ Server runtime error:", err);
  }
});
