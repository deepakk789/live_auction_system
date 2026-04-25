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

// Root route to prevent "Cannot GET /" error
app.get("/", (req, res) => {
  res.send(`
    <div style="font-family: sans-serif; padding: 40px; text-align: center;">
      <h1 style="color: #4CAF50;">Backend is successfully deployed and running!</h1>
      <p>This is the API server for the Live Auction System.</p>
      <p>To access the application, please visit the frontend URL.</p>
    </div>
  `);
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

// Online auction countdown timers: auctionId -> { timer, seconds }
const auctionCountdowns = new Map();

const startOnlineTimer = (auctionId, initialSeconds, io) => {
  const existing = auctionCountdowns.get(auctionId);
  if (existing && existing.timer) clearInterval(existing.timer);

  let seconds = initialSeconds;
  io.to(`auction_${auctionId}`).emit("bid_countdown_tick", { seconds });

  const timer = setInterval(async () => {
    seconds--;
    io.to(`auction_${auctionId}`).emit("bid_countdown_tick", { seconds });

    if (seconds <= 0) {
      clearInterval(timer);
      auctionCountdowns.delete(auctionId);

      try {
        const auction = await Auction.findById(auctionId);
        if (!auction) return;
        const players = await Player.find({ auctionId }).sort({ index: 1 });
        const currentPlayer = players[auction.currentPlayerIndex];
        if (!currentPlayer || currentPlayer.status === "SOLD" || currentPlayer.status === "UNSOLD") return;

        if (currentPlayer.currentBidder) {
          // AUTO-SELL
          const winningTeam = currentPlayer.currentBidder;
          const soldPrice = currentPlayer.currentBid;

          currentPlayer.status = "SOLD";
          currentPlayer.soldTo = winningTeam;
          currentPlayer.soldPrice = soldPrice;
          await currentPlayer.save();

          await Team.updateOne(
            { auctionId, name: winningTeam },
            { 
              $inc: { budget: -soldPrice },
              $push: { players: { name: currentPlayer.name, price: soldPrice } }
            }
          );

          // Broadcast to everyone to update teams DB!
          const freshTeams = await Team.find({ auctionId });
          io.to(`auction_${auctionId}`).emit("teams_update", freshTeams.map(t => ({ name: t.name, budget: t.budget, players: t.players })));

          io.to(`auction_${auctionId}`).emit("player_sold_auto", {
            playerIndex: auction.currentPlayerIndex,
            playerName: currentPlayer.name,
            soldTo: winningTeam,
            soldPrice
          });
        } else {
          // AUTO-UNSOLD
          currentPlayer.status = "UNSOLD";
          await currentPlayer.save();

          io.to(`auction_${auctionId}`).emit("player_skipped", {
            playerIndex: auction.currentPlayerIndex,
            playerName: currentPlayer.name
          });
        }

        // Auto-advance
        setTimeout(async () => {
          try {
            const auc = await Auction.findById(auctionId);
            if (!auc) return;
            const allPlayers = await Player.find({ auctionId }).sort({ index: 1 });
            
            let nextIdx = null;
            if (auc.queuedPlayerIndex !== null) {
              nextIdx = auc.queuedPlayerIndex;
              auc.queuedPlayerIndex = null; // Clear the queue
            } else {
              nextIdx = auc.currentPlayerIndex + 1;
              while (nextIdx < allPlayers.length && allPlayers[nextIdx].status !== "UPCOMING") {
                nextIdx++;
              }
            }
            
            if (nextIdx !== null && nextIdx < allPlayers.length) {
              auc.currentPlayerIndex = nextIdx;
              await auc.save();
              
              const nextPlayer = allPlayers[nextIdx];
              nextPlayer.status = "LIVE";
              await nextPlayer.save();

              const currentTeams = await Team.find({ auctionId });
              io.to(`auction_${auctionId}`).emit("online_next_player", {
                playerIndex: nextIdx,
                player: nextPlayer,
                teams: currentTeams.map(t => ({ name: t.name, budget: t.budget, players: t.players }))
              });

              // Start timer for the new player!
              startOnlineTimer(auctionId, 15, io);
            } else {
              io.to(`auction_${auctionId}`).emit("online_auction_complete", {});
            }
          } catch (err) {
            console.error("Auto-advance error:", err.message);
          }
        }, 3000);

      } catch (err) {
        console.error("Auto-sell error:", err.message);
      }
    }
  }, 1000);

  auctionCountdowns.set(auctionId, { timer, seconds });
};

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
  socket.on("manager_join", async ({ auctionId, teamName }) => {
    if (!auctionId || !teamName) return;
    managerConnections.set(socket.id, { auctionId, teamName });
    io.to(`auction_${auctionId}`).emit("manager_status_change", { teamName, status: "Connected" });

    try {
      const auction = await Auction.findById(auctionId);
      if (auction && auction.state === "PAUSED") {
        const teams = await Team.find({ auctionId });
        let allOnline = true;
        for (const t of teams) {
          if (t.managerUsername) {
            let found = false;
            for (const conn of managerConnections.values()) {
              if (conn.auctionId === auctionId && conn.teamName === t.name) {
                found = true;
                break;
              }
            }
            if (!found) {
              allOnline = false;
              break;
            }
          }
        }

        if (allOnline) {
          await Auction.updateOne({ _id: auctionId }, { state: "RESUMING" });
          io.to(`auction_${auctionId}`).emit("auction_state", "RESUMING");

          // Start 10s resuming timer
          let resumeSeconds = 10;
          io.to(`auction_${auctionId}`).emit("resume_countdown_tick", { seconds: resumeSeconds });

          const existing = auctionCountdowns.get(auctionId);
          if (existing && existing.timer) clearInterval(existing.timer);

          const rTimer = setInterval(async () => {
            resumeSeconds--;
            io.to(`auction_${auctionId}`).emit("resume_countdown_tick", { seconds: resumeSeconds });

            if (resumeSeconds <= 0) {
              clearInterval(rTimer);
              await Auction.updateOne({ _id: auctionId }, { state: "LIVE" });
              io.to(`auction_${auctionId}`).emit("auction_state", "LIVE");

              if (existing) {
                startOnlineTimer(auctionId, Math.max(existing.seconds || 15, 5), io);
              } else {
                startOnlineTimer(auctionId, 15, io);
              }
            }
          }, 1000);
          
          auctionCountdowns.set(auctionId, { timer: rTimer, seconds: existing ? existing.seconds : 15 });
        }
      }
    } catch (err) {
      console.error("Resume error:", err);
    }
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

  // ═══════════════════════════════════════
  // ONLINE AUCTION: BIDDING + COUNTDOWN
  // ═══════════════════════════════════════

  socket.on("online_bid", async ({ auctionId, teamName, amount }) => {
    if (!auctionId || !teamName || !amount) return;

    try {
      // Validate: get current auction state
      const auction = await Auction.findById(auctionId);
      if (!auction || auction.state !== "LIVE") return;

      const players = await Player.find({ auctionId }).sort({ index: 1 });
      const currentPlayer = players[auction.currentPlayerIndex];
      if (!currentPlayer || currentPlayer.status === "SOLD" || currentPlayer.status === "UNSOLD") return;

      // Validate bid is higher
      if (amount <= (currentPlayer.currentBid || 0)) return;

      // Validate team budget
      const team = await Team.findOne({ auctionId, name: teamName });
      if (!team || team.budget < amount) return;

      // Accept bid — update DB
      currentPlayer.currentBid = amount;
      currentPlayer.currentBidder = teamName;
      currentPlayer.status = "LIVE";
      await currentPlayer.save();

      // Broadcast accepted bid to all clients
      io.to(`auction_${auctionId}`).emit("bid_accepted", {
        playerIndex: auction.currentPlayerIndex,
        amount,
        teamName,
        playerName: currentPlayer.name
      });

      // Start/reset 10-second countdown
      startOnlineTimer(auctionId, 10, io);

    } catch (err) {
      console.error("Online bid error:", err.message);
    }
  });

  // Organizer queues a player for the next round
  socket.on("organizer_set_player", async ({ auctionId, playerIndex }) => {
    if (!auctionId || playerIndex === undefined) return;
    
    try {
      const auction = await Auction.findById(auctionId);
      if (!auction) return;

      const players = await Player.find({ auctionId }).sort({ index: 1 });
      if (playerIndex >= players.length) return;

      const targetPlayer = players[playerIndex];
      if (targetPlayer.status === "SOLD") return;

      auction.queuedPlayerIndex = playerIndex;
      await auction.save();

      socket.emit("player_queued", { playerName: targetPlayer.name });
    } catch (err) {
      console.error("Queue player error:", err.message);
    }
  });

  // Organizer force-skips (marks unsold)
  socket.on("organizer_skip_player", async ({ auctionId }) => {
    if (!auctionId) return;

    try {
      // Clear countdown
      const existing = auctionCountdowns.get(auctionId);
      if (existing && existing.timer) {
        clearInterval(existing.timer);
        auctionCountdowns.delete(auctionId);
      }

      const auction = await Auction.findById(auctionId);
      if (!auction) return;

      const players = await Player.find({ auctionId }).sort({ index: 1 });
      const currentPlayer = players[auction.currentPlayerIndex];
      if (currentPlayer && currentPlayer.status !== "SOLD") {
        currentPlayer.status = "UNSOLD";
        currentPlayer.currentBid = 0;
        currentPlayer.currentBidder = null;
        await currentPlayer.save();
      }

      io.to(`auction_${auctionId}`).emit("player_skipped", {
        playerIndex: auction.currentPlayerIndex,
        playerName: currentPlayer?.name
      });

      // Auto-advance after 2 seconds
      setTimeout(async () => {
        try {
          const auc = await Auction.findById(auctionId);
          if (!auc) return;
          const allPlayers = await Player.find({ auctionId }).sort({ index: 1 });
          
          let nextIdx = null;
          if (auc.queuedPlayerIndex !== null) {
            nextIdx = auc.queuedPlayerIndex;
            auc.queuedPlayerIndex = null; // Clear the queue
          } else {
            nextIdx = auc.currentPlayerIndex + 1;
            while (nextIdx < allPlayers.length && allPlayers[nextIdx].status !== "UPCOMING") {
              nextIdx++;
            }
          }

          if (nextIdx !== null && nextIdx < allPlayers.length) {
            auc.currentPlayerIndex = nextIdx;
            await auc.save();

            const nextPlayer = allPlayers[nextIdx];
            nextPlayer.status = "LIVE";
            await nextPlayer.save();

            const freshTeams = await Team.find({ auctionId });
            io.to(`auction_${auctionId}`).emit("online_next_player", {
              playerIndex: nextIdx,
              player: nextPlayer,
              teams: freshTeams.map(t => ({ name: t.name, budget: t.budget, players: t.players }))
            });
            
            // Start timer for new player!
            startOnlineTimer(auctionId, 15, io);
          } else {
            io.to(`auction_${auctionId}`).emit("online_auction_complete", {});
          }
        } catch (err) {
          console.error("Skip advance error:", err.message);
        }
      }, 2000);
    } catch (err) {
      console.error("Skip player error:", err.message);
    }
  });

  // Organizer starts online auction
  socket.on("start_online_auction", async ({ auctionId }) => {
    if (!auctionId) return;
    try {
      const auction = await Auction.findById(auctionId);
      if (!auction) return;

      auction.state = "LIVE";
      await auction.save();

      const players = await Player.find({ auctionId }).sort({ index: 1 });
      if (players.length > 0) {
        const firstPlayer = players[0];
        firstPlayer.status = "LIVE";
        await firstPlayer.save();
        auction.currentPlayerIndex = 0;
        await auction.save();
      }

      const freshTeams = await Team.find({ auctionId });

      io.to(`auction_${auctionId}`).emit("auction_state", "LIVE");
      io.to(`auction_${auctionId}`).emit("online_next_player", {
        playerIndex: 0,
        player: players[0] || null,
        teams: freshTeams.map(t => ({ name: t.name, budget: t.budget, players: t.players }))
      });
      
      // Start initial timer
      startOnlineTimer(auctionId, 15, io);
    } catch (err) {
      console.error("Start online auction error:", err.message);
    }
  });

  // ═══════════════════════════════════════
  // OFFLINE AUCTION (existing events)
  // ═══════════════════════════════════════

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

  // 🔥 VIEWER ONLINE BIDDING (legacy — for offline mode organizer-mediated)
  socket.on("viewer_bid", ({ auctionId, teamName, amount }) => {
    if (auctionId) {
      io.to(`auction_${auctionId}`).emit("viewer_bid_received", { teamName, amount });
    }
  });

  socket.on("disconnect", async () => {
    console.log("Client disconnected:", socket.id);
    const mConn = managerConnections.get(socket.id);
    if (mConn) {
      const { auctionId, teamName } = mConn;
      io.to(`auction_${auctionId}`).emit("manager_status_change", { teamName, status: "Offline" });
      io.to(`auction_${auctionId}`).emit("team_quit_alert", { teamName });
      managerConnections.delete(socket.id);

      try {
        const auction = await Auction.findById(auctionId);
        if (auction && auction.state === "LIVE" && auction.biddingMode === "ONLINE") {
          // Pause auction timer
          const existing = auctionCountdowns.get(auctionId);
          if (existing && existing.timer) {
            clearInterval(existing.timer);
            auctionCountdowns.set(auctionId, { timer: null, seconds: existing.seconds });
          }

          // Update DB state
          await Auction.updateOne({ _id: auctionId }, { state: "PAUSED" });
          io.to(`auction_${auctionId}`).emit("auction_state", "PAUSED");
        }
      } catch (err) {
        console.error("Disconnect pause error:", err);
      }
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
