const mongoose = require("mongoose");

const playerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },

    photo: {
      type: String,
      default: ""
    },

    details: {
      type: Object, // dynamic Excel fields
      default: {}
    },

    index: {
      type: Number,
      required: true
    },

    status: {
      type: String,
      enum: ["UPCOMING", "LIVE", "SOLD"],
      default: "UPCOMING"
    },

    currentBid: {
      type: Number,
      default: 0
    },

    soldTo: {
      type: String,
      default: null
    },

    soldPrice: {
      type: Number,
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Player", playerSchema);
