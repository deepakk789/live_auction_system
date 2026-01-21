const mongoose = require("mongoose");

const playerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    role: {
      type: String,
      required: true
    },
    basePrice: {
      type: Number,
      required: true
    },
    country: {
      type: String
    },
    status: {
      type: String,
      enum: ["UPCOMING", "LIVE", "SOLD", "UNSOLD"],
      default: "UPCOMING"
    },
    currentBid: {
      type: Number,
      default: 0
    },
    currentBidder: {
      type: String,
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Player", playerSchema);
