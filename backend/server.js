const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const auctionRoutes = require("./routes/auctionRoutes");

const app = express();

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

// Start server (ALWAYS LAST)
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

