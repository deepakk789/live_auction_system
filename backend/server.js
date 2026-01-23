require("dotenv").config(); 
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");

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

// MongoDB connection
mongoose
  .connect("mongodb://127.0.0.1:27017/auctionDB")
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error(err));

// Socket.IO setup
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

// Make io accessible in controllers
app.set("io", io);

// Socket events
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // 🔥 FORWARD PLAYER UPDATES (Organizer → Viewers)
  socket.on("auction_update", (data) => {
    // send to everyone EXCEPT sender
    socket.broadcast.emit("auction_update", data);
  });

  // 🔥 FORWARD AUCTION STATE (LIVE / BREAK / END)
  socket.on("auction_state", (state) => {
    socket.broadcast.emit("auction_state", state);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});


// Start server (ALWAYS LAST)
const PORT = 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
