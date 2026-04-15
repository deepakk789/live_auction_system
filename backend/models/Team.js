const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema(
  {
    auctionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auction",
      required: true,
      index: true
    },

    name: {
      type: String,
      required: true
    },

    budget: {
      type: Number,
      required: true
    },

    players: {
      type: [
        {
          name: String,
          price: Number
        }
      ],
      default: []
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Team", teamSchema);
