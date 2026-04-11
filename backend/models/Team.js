const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema(
  {
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
