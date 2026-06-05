const Auction = require("../models/Auction");
const Player = require("../models/player");
const Team = require("../models/Team");
const logger = require("../utils/logger");

/**
 * Register all OFFLINE auction socket event handlers.
 */
const registerOfflineAuctionEvents = (io, socket) => {

  // Forward player / state updates scoped by auctionId
  socket.on("auction_update", async (data) => {
    const room = data.auctionId ? `auction_${data.auctionId}` : null;

    if (room) {
      socket.to(room).emit("auction_update", data);
    } else {
      socket.broadcast.emit("auction_update", data);
    }

    try {
      if (data.auctionId) {
        await Auction.updateOne({ _id: data.auctionId }, { currentPlayerIndex: data.currentIndex });
      }
      if (data.players && data.players.length > 0) {
        const ops = data.players.map(p => ({
          updateOne: {
            filter: {
              index: p.index !== undefined ? p.index : p.id,
              ...(data.auctionId ? { auctionId: data.auctionId } : {}),
            },
            update: { $set: { status: p.status, currentBid: p.currentBid, soldTo: p.soldTo, soldPrice: p.soldPrice } },
          },
        }));
        await Player.bulkWrite(ops);
      }
    } catch (err) {
      logger.error(`DB sync error (auction_update): ${err.message}`);
    }
  });

  // Auction state change
  socket.on("auction_state", async ({ auctionId, state }) => {
    if (auctionId) {
      socket.to(`auction_${auctionId}`).emit("auction_state", state);
      try {
        await Auction.updateOne({ _id: auctionId }, { state });
      } catch (err) {
        logger.error(`DB sync error (auction_state): ${err.message}`);
      }
    } else {
      socket.broadcast.emit("auction_state", state);
    }
  });

  // Auction config sync
  socket.on("auction_config", async ({ auctionId, ...config }) => {
    if (auctionId) {
      socket.to(`auction_${auctionId}`).emit("auction_config", config);
      try {
        if (config.selectedFields) {
          await Auction.updateOne({ _id: auctionId }, { selectedFields: config.selectedFields });
        }
      } catch (err) {
        logger.error(`DB sync error (auction_config): ${err.message}`);
      }
    } else {
      socket.broadcast.emit("auction_config", config);
    }
  });

  // Teams state sync
  socket.on("teams_update", async ({ auctionId, teams }) => {
    if (auctionId) {
      socket.to(`auction_${auctionId}`).emit("teams_update", teams);
    } else {
      socket.broadcast.emit("teams_update", teams);
    }

    try {
      const teamData = teams || [];
      if (teamData.length > 0) {
        const ops = teamData.map(t => ({
          updateOne: {
            filter: { name: t.name, ...(auctionId ? { auctionId } : {}) },
            update: { $set: { budget: t.budget, players: t.players } },
            upsert: true,
          },
        }));
        await Team.bulkWrite(ops);
      }
    } catch (err) {
      logger.error(`DB sync error (teams_update): ${err.message}`);
    }
  });

  // Max bid cap update
  socket.on("max_bid_update", async ({ auctionId, value }) => {
    if (auctionId) {
      socket.to(`auction_${auctionId}`).emit("max_bid_update", value);
      try {
        await Auction.updateOne({ _id: auctionId }, { maxBid: value });
      } catch (err) {
        logger.error(`DB sync error (max_bid_update): ${err.message}`);
      }
    } else {
      socket.broadcast.emit("max_bid_update", value);
    }
  });

  // Organizer lock state
  socket.on("organizer_lock_change", ({ auctionId, activeOrganizer }) => {
    if (auctionId) {
      socket.to(`auction_${auctionId}`).emit("organizer_lock_change", { activeOrganizer });
    }
  });

  // Viewer bid relay (offline mode)
  socket.on("viewer_bid", ({ auctionId, teamName, amount }) => {
    if (auctionId) {
      io.to(`auction_${auctionId}`).emit("viewer_bid_received", { teamName, amount });
    }
  });

  // Full state sync log (organizer sends on reconnect)
  socket.on("sync_full_state", ({ auctionId }) => {
    logger.debug(`Full state sync received from organizer for auction ${auctionId || "global"}`);
  });
};

module.exports = { registerOfflineAuctionEvents };
