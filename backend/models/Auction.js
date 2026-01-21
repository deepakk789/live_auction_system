const mongoose = require("mongoose");

const auctionSchema = new mongoose.Schema({
  mode: {
    type: String,
    enum: ["RANDOM", "MANUAL"],
    default: "RANDOM"
  },
  currentPlayer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Player",
    default: null
  },
  isLive: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model("Auction", auctionSchema);
