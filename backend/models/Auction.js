const mongoose = require("mongoose");

const auctionSchema = new mongoose.Schema(
  {
    state: {
      type: String,
      enum: ["LIVE", "BREAK", "ENDED"],
      default: "LIVE"
    },

    mode: {
      type: String,
      enum: ["RANDOM", "MANUAL"],
      default: "MANUAL"
    },

    currentPlayerIndex: {
      type: Number,
      default: 0
    },

    bidSteps: {
      type: [Number],
      default: [10, 20, 50]
    },

    selectedFields: {
      type: [String],
      default: []
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Auction", auctionSchema);
