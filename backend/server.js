require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const auctionRoutes = require("./routes/auctionRoutes");

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

app.use("/api/auction", auctionRoutes);

// MongoDB Models
const Auction = require("./models/Auction");
const Player = require("./models/player");
const Team = require("./models/Team");

// Socket events
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // 🔥 FORWARD PLAYER UPDATES
  socket.on("auction_update", async (data) => {
    socket.broadcast.emit("auction_update", data);
    
    // Async DB update
    try {
      await Auction.updateOne({}, { currentPlayerIndex: data.currentIndex });
      if (data.players && data.players.length > 0) {
        const ops = data.players.map(p => ({
          updateOne: {
            filter: { index: p.index !== undefined ? p.index : p.id },
            update: { $set: { status: p.status, currentBid: p.currentBid, soldTo: p.soldTo, soldPrice: p.soldPrice } }
          }
        }));
        await Player.bulkWrite(ops);
      }
    } catch (err) {
      console.error("DB Sync Error (auction_update):", err.message);
    }
  });

  // 🔥 FORWARD AUCTION STATE
  socket.on("auction_state", async (state) => {
    socket.broadcast.emit("auction_state", state);
    try {
      await Auction.updateOne({}, { state });
    } catch (err) {
      console.error(err);
    }
  });

  // 🔥 RECEIVE AUCTION CONFIG
  socket.on("auction_config", async (config) => {
    socket.broadcast.emit("auction_config", config);
    try {
      if (config.selectedFields) {
        await Auction.updateOne({}, { selectedFields: config.selectedFields });
      }
    } catch (err) {
      console.error(err);
    }
  });

  // 🔥 RECEIVE TEAMS STATE
  socket.on("teams_update", async (teams) => {
    socket.broadcast.emit("teams_update", teams);
    try {
      if (teams && teams.length > 0) {
        const ops = teams.map(t => ({
          updateOne: {
            filter: { name: t.name },
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

  socket.on("max_bid_update", async (value) => {
    socket.broadcast.emit("max_bid_update", value);
    try {
      await Auction.updateOne({}, { maxBid: value });
    } catch (err) {
      console.error(err);
    }
  });

  socket.on("sync_full_state", async ({ playersState, auctionState, teamsState, auctionConfig }) => {
    // This event might not be needed much if OrganizerLive hydrated from DB,
    // but just broadcast if the Organizer still emits it.
    console.log("🔁 Full auction state synced from organizer");
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});


// Start server (ALWAYS LAST)
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

