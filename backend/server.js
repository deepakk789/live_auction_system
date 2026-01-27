require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
let lastTeamsState = null;
let lastPlayersState = null;
let lastAuctionState = "LIVE";

const auctionRoutes = require("./routes/auctionRoutes");

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.send("Auction Backend Running");
});

// API routes
app.use("/api/auction", auctionRoutes);

// MongoDB connection (Atlas)
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error("Mongo error:", err));


// Socket.IO setup
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

// Make io accessible in controllers
app.set("io", io);

let lastAuctionConfig = null;

// Socket events
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // 🔥 FORWARD PLAYER UPDATES (Organizer → Viewers)
  socket.on("auction_update", (data) => {
    lastPlayersState = data;                     // 🔥 store
    // send to everyone EXCEPT sender
    socket.broadcast.emit("auction_update", data);
  });

  // 🔥 FORWARD AUCTION STATE (LIVE / BREAK / END)
  socket.on("auction_state", (state) => {
    lastAuctionState = state;                    // 🔥 store
    socket.broadcast.emit("auction_state", state);
  });

  // 🔥 RECEIVE AUCTION CONFIG FROM ORGANIZER
  socket.on("auction_config", (config) => {
    lastAuctionConfig = config; // store latest selectedFields
    socket.broadcast.emit("auction_config", config); // send to viewers
  });

  // 🔥 VIEWER REQUESTS CONFIG (late join / refresh)
  socket.on("request_config", () => {
    if (lastAuctionConfig) {
      socket.emit("auction_config", lastAuctionConfig);
    }
  });

  // 🔥 RECEIVE TEAMS STATE FROM ORGANIZER
  socket.on("teams_update", (teams) => {
    lastTeamsState = teams;
    socket.broadcast.emit("teams_update", teams);
  });

  // 🔥 VIEWER REQUESTS TEAMS (late join / refresh)
  socket.on("request_teams", () => {
    if (lastTeamsState) {
      socket.emit("teams_update", lastTeamsState);
    }
  });

  socket.on("request_auction_state", () => {
    if (lastPlayersState) {
      socket.emit("auction_update", lastPlayersState);
    }
    if (lastAuctionState) {
      socket.emit("auction_state", lastAuctionState);
    }
  });

  socket.on("sync_full_state", ({ playersState, auctionState, teamsState, auctionConfig }) => {
    if (playersState) lastPlayersState = playersState;
    if (auctionState) lastAuctionState = auctionState;
    if (teamsState) lastTeamsState = teamsState;
    if (auctionConfig) lastAuctionConfig = auctionConfig;

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

