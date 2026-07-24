const Auction = require("../models/Auction");
const Player = require("../models/player");
const Team = require("../models/Team");
const logger = require("../utils/logger");

// auctionId -> { timer, seconds }
const auctionCountdowns = new Map();

/**
 * Start (or restart) a countdown timer for an auction.
 * On expiry: auto-sell or auto-unsold, then auto-advance to next player.
 */
const startOnlineTimer = (auctionId, initialSeconds, io) => {
  const existing = auctionCountdowns.get(auctionId);
  if (existing && existing.timer) clearInterval(existing.timer);

  let seconds = initialSeconds;
  io.to(`auction_${auctionId}`).emit("bid_countdown_tick", { seconds });

  const timer = setInterval(async () => {
    seconds--;
    io.to(`auction_${auctionId}`).emit("bid_countdown_tick", { seconds });

    if (seconds <= 0) {
      clearInterval(timer);
      auctionCountdowns.delete(auctionId);

      try {
        const auction = await Auction.findById(auctionId);
        if (!auction) return;

        const players = await Player.find({ auctionId }).sort({ index: 1 });
        const currentPlayer = players[auction.currentPlayerIndex];
        if (!currentPlayer || currentPlayer.status === "SOLD" || currentPlayer.status === "UNSOLD") return;

        if (currentPlayer.currentBidder) {
          // AUTO-SELL
          const winningTeam = currentPlayer.currentBidder;
          const soldPrice = currentPlayer.currentBid;

          // Atomic check and update to ensure no late bids are overwritten
          const updatedPlayer = await Player.findOneAndUpdate(
            {
              _id: currentPlayer._id,
              status: "LIVE",
              currentBid: soldPrice,
              currentBidder: winningTeam
            },
            {
              $set: {
                status: "SOLD",
                soldTo: winningTeam,
                soldPrice: soldPrice
              }
            },
            { new: true }
          );

          if (!updatedPlayer) {
            logger.warn(`Auto-sell aborted for player ${currentPlayer.name}: bid or status changed in the last millisecond.`);
            return;
          }

          await Team.updateOne(
            { auctionId, name: winningTeam },
            {
              $inc: { budget: -soldPrice },
              $push: { players: { name: updatedPlayer.name, price: soldPrice } },
            }
          );

          const freshTeams = await Team.find({ auctionId });
          io.to(`auction_${auctionId}`).emit("teams_update", freshTeams.map(t => ({ name: t.name, budget: t.budget, players: t.players })));
          io.to(`auction_${auctionId}`).emit("player_sold_auto", {
            playerIndex: auction.currentPlayerIndex,
            playerName: updatedPlayer.name,
            soldTo: winningTeam,
            soldPrice,
          });
        } else {
          // AUTO-UNSOLD
          // Atomic check and update to ensure no late bids are overwritten
          const updatedPlayer = await Player.findOneAndUpdate(
            {
              _id: currentPlayer._id,
              status: "LIVE",
              $and: [
                {
                  $or: [
                    { currentBid: 0 },
                    { currentBid: { $exists: false } },
                    { currentBid: null }
                  ]
                },
                {
                  $or: [
                    { currentBidder: null },
                    { currentBidder: { $exists: false } }
                  ]
                }
              ]
            },
            {
              $set: { status: "UNSOLD" }
            },
            { new: true }
          );

          if (!updatedPlayer) {
            logger.warn(`Auto-unsold aborted for player ${currentPlayer.name}: a bid was placed in the last millisecond.`);
            return;
          }

          io.to(`auction_${auctionId}`).emit("player_skipped", {
            playerIndex: auction.currentPlayerIndex,
            playerName: updatedPlayer.name,
          });
        }

        // AUTO-ADVANCE
        setTimeout(() => advanceToNextPlayer(auctionId, io), 3000);
      } catch (err) {
        logger.error(`Auto-sell error [auction ${auctionId}]: ${err.message}`);
      }
    }
  }, 1000);

  auctionCountdowns.set(auctionId, { timer, seconds });
};

/**
 * Advance to the next UPCOMING player (or complete the auction).
 */
const advanceToNextPlayer = async (auctionId, io) => {
  try {
    const auc = await Auction.findById(auctionId);
    if (!auc) return;

    const allPlayers = await Player.find({ auctionId }).sort({ index: 1 });

    let nextIdx = null;
    if (auc.queuedPlayerIndex !== null) {
      nextIdx = auc.queuedPlayerIndex;
      auc.queuedPlayerIndex = null;
    } else {
      nextIdx = auc.currentPlayerIndex + 1;
      while (nextIdx < allPlayers.length && allPlayers[nextIdx].status !== "UPCOMING") {
        nextIdx++;
      }
    }

    if (nextIdx !== null && nextIdx < allPlayers.length) {
      auc.currentPlayerIndex = nextIdx;
      await auc.save();

      const nextPlayer = allPlayers[nextIdx];
      nextPlayer.status = "LIVE";
      await nextPlayer.save();

      const currentTeams = await Team.find({ auctionId });
      io.to(`auction_${auctionId}`).emit("online_next_player", {
        playerIndex: nextIdx,
        player: nextPlayer,
        teams: currentTeams.map(t => ({ name: t.name, budget: t.budget, players: t.players })),
      });

      startOnlineTimer(auctionId, 15, io);
    } else {
      io.to(`auction_${auctionId}`).emit("online_auction_complete", {});
    }
  } catch (err) {
    logger.error(`Advance player error [auction ${auctionId}]: ${err.message}`);
  }
};

/**
 * Clear the timer for a given auction (e.g., on disconnect).
 */
const clearTimer = (auctionId) => {
  const existing = auctionCountdowns.get(auctionId);
  if (existing && existing.timer) {
    clearInterval(existing.timer);
    auctionCountdowns.set(auctionId, { timer: null, seconds: existing.seconds });
  }
  return existing;
};

/**
 * Get current timer state (seconds remaining).
 */
const getTimerState = (auctionId) => auctionCountdowns.get(auctionId) || null;

module.exports = { startOnlineTimer, advanceToNextPlayer, clearTimer, getTimerState, auctionCountdowns };
