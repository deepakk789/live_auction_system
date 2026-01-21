const Player = require("../models/Player");
const Auction = require("../models/Auction");

/**
 * Set auction mode: RANDOM or MANUAL
 */
exports.setMode = async (req, res) => {
  try {
    const { mode } = req.body;

    if (!["RANDOM", "MANUAL"].includes(mode)) {
      return res.status(400).json({ message: "Invalid mode" });
    }

    let auction = await Auction.findOne();
    if (!auction) {
      auction = await Auction.create({});
    }

    auction.mode = mode;
    await auction.save();

    res.json({
      message: "Auction mode updated successfully",
      mode
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Bring next player to auction
 * - RANDOM: system picks random UPCOMING player
 * - MANUAL: organizer sends playerId
 */
exports.nextPlayer = async (req, res) => {
  try {
    let auction = await Auction.findOne();
    if (!auction) {
      auction = await Auction.create({});
    }

    let player;

    if (auction.mode === "RANDOM") {
      const players = await Player.find({ status: "UPCOMING" });

      if (players.length === 0) {
        return res.json({ message: "No players left for auction" });
      }

      player = players[Math.floor(Math.random() * players.length)];
    } else {
      const { playerId } = req.body;

      if (!playerId) {
        return res
          .status(400)
          .json({ message: "playerId is required in MANUAL mode" });
      }

      player = await Player.findById(playerId);
      if (!player) {
        return res.status(404).json({ message: "Player not found" });
      }
    }

    player.status = "LIVE";
    await player.save();

    auction.currentPlayer = player._id;
    auction.isLive = true;
    await auction.save();

    res.json(player);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/**
 * Get all UPCOMING players (for manual selection)
 */
exports.getUpcomingPlayers = async (req, res) => {
  try {
    const players = await Player.find({ status: "UPCOMING" });

    res.json(players);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};