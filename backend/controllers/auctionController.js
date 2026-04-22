const Player = require("../models/player");
const Auction = require("../models/Auction");
const Team = require("../models/Team");
const User = require("../models/User");

/**
 * Set auction mode: RANDOM or MANUAL
 */
exports.setMode = async (req, res) => {
  try {
    const { auctionId, mode } = req.body;

    if (!["RANDOM", "MANUAL"].includes(mode)) {
      return res.status(400).json({ message: "Invalid mode" });
    }

    const auction = await Auction.findById(auctionId);
    if (!auction) {
      return res.status(404).json({ message: "Auction not found" });
    }

    auction.mode = mode;
    await auction.save();

    res.json({ message: "Auction mode updated successfully", mode });
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
    const { auctionId } = req.body;
    const auction = await Auction.findById(auctionId);
    if (!auction) {
      return res.status(404).json({ message: "Auction not found" });
    }

    let player;

    if (auction.mode === "RANDOM") {
      const players = await Player.find({ auctionId, status: "UPCOMING" });

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

    // 🔴 SOCKET EMIT: new live player
    const io = req.app.get("io");
    io.to(`auction_${auctionId}`).emit("player_live", player);

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
    const { auctionId } = req.query;
    const filter = auctionId ? { status: "UPCOMING", auctionId } : { status: "UPCOMING" };
    const players = await Player.find(filter);

    res.json(players);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Organizer updates bid manually
 */
exports.updateBid = async (req, res) => {
  try {
    const { playerId, amount, bidder } = req.body;

    const player = await Player.findById(playerId);
    if (!player || player.status !== "LIVE") {
      return res.status(400).json({ message: "Player not live" });
    }

    if (amount <= player.currentBid) {
      return res.status(400).json({ message: "Bid must be higher than current bid" });
    }

    player.currentBid = amount;
    player.currentBidder = bidder;
    await player.save();

    // 🔴 SOCKET EMIT: bid updated
    const io = req.app.get("io");
    io.to(`auction_${player.auctionId}`).emit("bid_update", player);

    res.json(player);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/**
 * Organizer marks player as SOLD
 */
exports.markSold = async (req, res) => {
  try {
    const { playerId } = req.body;

    const player = await Player.findById(playerId);
    if (!player) {
      return res.status(404).json({ message: "Player not found" });
    }

    player.status = "SOLD";
    await player.save();

    // 🔴 SOCKET EMIT: player sold
    const io = req.app.get("io");
    io.to(`auction_${player.auctionId}`).emit("player_sold", player);

    res.json(player);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * INIT AUCTION — creates a new auction (multi-auction support)
 * Requires authenticated user (organizer)
 */
exports.initAuction = async (req, res) => {
  try {
    const { auctionSetup, teamsState } = req.body;

    // Create Auction config with organizer
    const auction = await Auction.create({
      auctionName: auctionSetup.auctionName,
      teamCount: auctionSetup.teamCount,
      maxBudget: auctionSetup.maxBudget,
      bidSteps: auctionSetup.bidSteps || [10, 20, 50],
      biddingMode: auctionSetup.biddingMode || "OFFLINE",
      state: "UPCOMING",
      currentPlayerIndex: 0,
      organizer: req.user._id
    });

    // Create Teams scoped to this auction
    const teamOps = await Promise.all(teamsState.map(async (t) => {
      let managerId = null;
      if (t.managerUsername) {
        const user = await User.findOne({ username: new RegExp(`^${t.managerUsername}$`, "i") });
        if (user) managerId = user._id;
      }
      return {
        name: t.name,
        budget: t.budget,
        players: t.players || [],
        auctionId: auction._id,
        managerUsername: t.managerUsername || null,
        manager: managerId
      };
    }));
    
    const createdTeams = await Team.insertMany(teamOps);

    res.json({
      message: "Auction created successfully",
      auction: {
        _id: auction._id,
        auctionCode: auction.auctionCode,
        auctionName: auction.auctionName
      },
      teams: createdTeams
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * UPLOAD PLAYERS — scoped to a specific auction
 */
exports.uploadPlayers = async (req, res) => {
  try {
    const { players, auctionConfig, auctionId } = req.body;

    if (!auctionId) {
      return res.status(400).json({ error: "auctionId is required" });
    }

    // Delete old players for THIS auction only
    await Player.deleteMany({ auctionId });

    // Insert players scoped to this auction
    const createdPlayers = await Player.insertMany(players.map((p, i) => ({
      ...p,
      index: p.id !== undefined ? p.id : i,
      auctionId
    })));

    // Update Auction with config
    const auction = await Auction.findById(auctionId);
    if (auction) {
       auction.selectedFields = auctionConfig.selectedFields || [];
       auction.columns = auctionConfig.columns || [];
       auction.uploadedFileName = auctionConfig.uploadedFileName || "";
       await auction.save();
    }

    res.json({ message: "Players uploaded", count: createdPlayers.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * SYNC STATE — scoped by auctionId (hydrates the frontend)
 */
exports.syncState = async (req, res) => {
  try {
    const { auctionId } = req.params;

    const auction = await Auction.findById(auctionId).populate("organizer", "username email");
    if (!auction) {
      return res.status(404).json({ error: "Auction not found" });
    }

    const teams = await Team.find({ auctionId });
    const playersArr = await Player.find({ auctionId }).sort({ index: 1 });

    const playersState = {
      currentIndex: auction.currentPlayerIndex || 0,
      players: playersArr
    };

    const auctionSetup = {
      auctionName: auction.auctionName,
      teamCount: auction.teamCount,
      maxBudget: auction.maxBudget,
      bidSteps: auction.bidSteps
    };

    const auctionConfig = {
      selectedFields: auction.selectedFields,
      columns: auction.columns,
      uploadedFileName: auction.uploadedFileName
    };

    res.json({
      auctionSetup,
      auctionConfig,
      teamsState: teams.map(t => ({ name: t.name, budget: t.budget, players: t.players })),
      playersState,
      auctionState: auction.state || "LIVE",
      maxBid: auction.maxBid,
      auctionCode: auction.auctionCode,
      organizer: auction.organizer
        ? { _id: auction.organizer._id, username: auction.organizer.username }
        : null
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * RESET AUCTION — scoped by auctionId
 */
exports.resetAuction = async (req, res) => {
  try {
    const { auctionId } = req.body;

    const auction = await Auction.findById(auctionId);
    if (!auction) {
      return res.status(404).json({ message: "Auction not found" });
    }

    // Snapshot current auction before marking it done
    if (auction.state !== "ENDED") {
      const teams = await Team.find({ auctionId });
      const players = await Player.find({ auctionId }).sort({ index: 1 });
      auction.state = "ENDED";
      auction.endedAt = new Date();
      auction.snapshot = {
        teams: teams.map(t => ({ name: t.name, budget: t.budget, players: t.players })),
        players: players.map(p => ({ name: p.name, status: p.status, soldTo: p.soldTo, soldPrice: p.soldPrice, currentBid: p.currentBid, details: p.details }))
      };
      auction.markModified('snapshot');
      await auction.save();
    }

    await Team.deleteMany({ auctionId });
    await Player.deleteMany({ auctionId });

    // Notify all clients in this auction room
    const io = req.app.get("io");
    if (io) {
      io.to(`auction_${auctionId}`).emit("auction_state", "ENDED");
      io.to(`auction_${auctionId}`).emit("auction_reset", true);
    }

    res.json({ message: "Auction fully reset and archived." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * LIST ALL AUCTIONS (for Live/Past pages)
 * Populates organizer info so frontend can do smart navigation
 */
exports.listAuctions = async (req, res) => {
  try {
    const auctions = await Auction.find()
      .populate("organizer", "username email")
      .sort({ createdAt: -1 });
    res.json(auctions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * END AUCTION — organizer explicitly ends it, saves snapshot
 */
exports.endAuction = async (req, res) => {
  try {
    const { auctionId } = req.body;

    const auction = await Auction.findById(auctionId);
    if (!auction) return res.status(404).json({ message: "Auction not found" });
    if (auction.state === "ENDED") return res.status(400).json({ message: "Auction already ended" });

    const teams = await Team.find({ auctionId });
    const players = await Player.find({ auctionId }).sort({ index: 1 });

    auction.state = "ENDED";
    auction.endedAt = new Date();
    auction.snapshot = {
      teams: teams.map(t => ({ name: t.name, budget: t.budget, players: t.players })),
      players: players.map(p => ({ name: p.name, status: p.status, soldTo: p.soldTo, soldPrice: p.soldPrice, currentBid: p.currentBid, details: p.details }))
    };
    auction.markModified('snapshot');
    await auction.save();

    const io = req.app.get("io");
    if (io) io.to(`auction_${auctionId}`).emit("auction_state", "ENDED");

    res.json({ message: "Auction ended and archived.", auctionId: auction._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET ANALYTICS FOR A SPECIFIC PAST AUCTION (by ID)
 */
exports.getAuctionAnalytics = async (req, res) => {
  try {
    const { id } = req.params;
    const auction = await Auction.findById(id).populate("organizer", "username");
    if (!auction) return res.status(404).json({ message: "Auction not found" });

    // For ended auctions, return snapshot; for live auction return live data
    if (auction.state === "ENDED" && auction.snapshot) {
      return res.json({
        auctionName: auction.auctionName,
        state: auction.state,
        endedAt: auction.endedAt,
        teamCount: auction.teamCount,
        maxBudget: auction.maxBudget,
        createdAt: auction.createdAt,
        teamsState: auction.snapshot.teams || [],
        playersState: { players: auction.snapshot.players || [] },
        organizer: auction.organizer ? { username: auction.organizer.username } : null
      });
    }

    // Live auction — serve real-time data
    const teams = await Team.find({ auctionId: id });
    const players = await Player.find({ auctionId: id }).sort({ index: 1 });
    res.json({
      auctionName: auction.auctionName,
      state: auction.state,
      teamCount: auction.teamCount,
      maxBudget: auction.maxBudget,
      createdAt: auction.createdAt,
      teamsState: teams.map(t => ({ name: t.name, budget: t.budget, players: t.players })),
      playersState: { players },
      organizer: auction.organizer ? { username: auction.organizer.username } : null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * SEARCH AUCTIONS — by name or auction code
 */
exports.searchAuction = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.json([]);
    }

    const query = q.trim();

    // Search by exact code (case-insensitive) OR name contains
    const auctions = await Auction.find({
      $or: [
        { auctionCode: query.toUpperCase() },
        { auctionName: { $regex: query, $options: "i" } }
      ]
    })
      .populate("organizer", "username email")
      .sort({ createdAt: -1 });

    res.json(auctions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET AUCTION BY CODE — lookup by unique auction code
 */
exports.getAuctionByCode = async (req, res) => {
  try {
    const { code } = req.params;

    const auction = await Auction.findOne({ auctionCode: code.toUpperCase() })
      .populate("organizer", "username email");

    if (!auction) {
      return res.status(404).json({ message: "No auction found with that code" });
    }

    res.json(auction);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * ADD CO-ORGANIZER
 */

exports.addCoOrganizer = async (req, res) => {
  try {
    const { auctionId } = req.params;
    const { identifier } = req.body; // Can be username or email

    const auction = req.auction; // From organizerOnly middleware

    if (auction.coOrganizers && auction.coOrganizers.length >= 3) {
      return res.status(400).json({ error: "Maximum of 3 co-organizers allowed" });
    }

    const newOrganizer = await User.findOne({
      $or: [{ username: identifier }, { email: identifier }]
    });

    if (!newOrganizer) {
      return res.status(404).json({ error: "User not found" });
    }

    if (auction.organizer.toString() === newOrganizer._id.toString() || 
        (auction.coOrganizers && auction.coOrganizers.includes(newOrganizer._id))) {
      return res.status(400).json({ error: "User is already an organizer" });
    }

    auction.coOrganizers.push(newOrganizer._id);
    await auction.save();

    res.json({ message: "Co-organizer added", user: { _id: newOrganizer._id, username: newOrganizer.username }});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * REMOVE CO-ORGANIZER
 */
exports.removeCoOrganizer = async (req, res) => {
  try {
    const { auctionId, userId } = req.params;
    const auction = req.auction; // From organizerOnly middleware

    auction.coOrganizers = auction.coOrganizers.filter(id => id.toString() !== userId);
    await auction.save();

    res.json({ message: "Co-organizer removed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * CLAIM ORGANIZER LOCK
 */
exports.claimOrganizerLock = async (req, res) => {
  try {
    const { auctionId } = req.params;
    const auction = req.auction; // Main or co-organizer

    if (auction.activeOrganizer && auction.activeOrganizer.toString() !== req.user._id.toString()) {
      return res.status(409).json({ error: "Lock already held by another organizer" });
    }

    auction.activeOrganizer = req.user._id;
    await auction.save();

    res.json({ message: "Lock claimed", activeOrganizer: req.user._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * RELEASE ORGANIZER LOCK
 */
exports.releaseOrganizerLock = async (req, res) => {
  try {
    const { auctionId } = req.params;
    const auction = req.auction; 

    if (auction.activeOrganizer && auction.activeOrganizer.toString() === req.user._id.toString()) {
      auction.activeOrganizer = null;
      await auction.save();
    }

    res.json({ message: "Lock released" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
