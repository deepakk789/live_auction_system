const mongoose = require("mongoose");
const crypto = require("crypto");

/**
 * Generate a 6-character uppercase alphanumeric code
 */
function generateAuctionCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

const auctionSchema = new mongoose.Schema(
  {
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    coOrganizers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }],

    activeOrganizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    biddingMode: {
      type: String,
      enum: ["ONLINE", "OFFLINE"],
      default: "OFFLINE"
    },

    auctionCode: {
      type: String,
      unique: true,
      uppercase: true,
      index: true
    },

    state: {
      type: String,
      enum: ["UPCOMING", "LIVE", "BREAK", "ENDED"],
      default: "UPCOMING"
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
    },

    auctionName: {
      type: String,
      default: "Auction"
    },

    teamCount: {
      type: Number,
      default: 2
    },

    maxBudget: {
      type: Number,
      default: 0
    },

    maxBid: {
      type: Number,
      default: null
    },

    uploadedFileName: {
      type: String,
      default: ""
    },

    columns: {
      type: [String],
      default: []
    },

    endedAt: {
      type: Date,
      default: null
    },

    // Snapshot stored when auction ends (teams + players for analytics)
    snapshot: {
      type: Object,
      default: null
    }
  },
  { timestamps: true }
);

// Auto-generate unique auction code before saving
auctionSchema.pre("save", async function () {
  if (!this.auctionCode) {
    let code;
    let exists = true;
    // Keep generating until we find a unique code
    while (exists) {
      code = generateAuctionCode();
      exists = await mongoose.model("Auction").findOne({ auctionCode: code });
    }
    this.auctionCode = code;
  }
});

module.exports = mongoose.model("Auction", auctionSchema);
