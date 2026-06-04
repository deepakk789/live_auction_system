const Auction = require("../models/Auction");
const Player = require("../models/player");
const Team = require("../models/Team");
const logger = require("../utils/logger");
const { startOnlineTimer, advanceToNextPlayer, clearTimer, getTimerState, auctionCountdowns } = require("./timerService");

// socket.id -> { auctionId, teamName }
const managerConnections = new Map();

/**
 * Register all ONLINE auction socket event handlers.
 */
const registerOnlineAuctionEvents = (io, socket) => {

  // ── ORGANIZER: Start online auction ──────────────────────────────
  socket.on("start_online_auction", async ({ auctionId }) => {
    if (!auctionId) return;
    try {
      const auction = await Auction.findById(auctionId);
      if (!auction) return;

      auction.state = "LIVE";
      await auction.save();

      const players = await Player.find({ auctionId }).sort({ index: 1 });
      if (players.length > 0) {
        players[0].status = "LIVE";
        await players[0].save();
        auction.currentPlayerIndex = 0;
        await auction.save();
      }

      const freshTeams = await Team.find({ auctionId });
      io.to(`auction_${auctionId}`).emit("auction_state", "LIVE");
      io.to(`auction_${auctionId}`).emit("online_next_player", {
        playerIndex: 0,
        player: players[0] || null,
        teams: freshTeams.map(t => ({ name: t.name, budget: t.budget, players: t.players })),
      });

      startOnlineTimer(auctionId, 15, io);
    } catch (err) {
      logger.error(`start_online_auction error: ${err.message}`);
    }
  });

  // ── TEAM: Place a bid ────────────────────────────────────────────
  socket.on("online_bid", async ({ auctionId, teamName, amount }) => {
    if (!auctionId || !teamName || !amount) return;

    // Security: verify the bidding socket belongs to this team
    if (socket.user) {
      const team = await Team.findOne({ auctionId, name: teamName });
      if (team && team.managerUsername) {
        const socketUsername = socket.user.username;
        if (socketUsername !== team.managerUsername) {
          logger.warn(`Unauthorized bid attempt by ${socketUsername} as team "${teamName}"`);
          return;
        }
      }
    }

    try {
      const auction = await Auction.findById(auctionId);
      if (!auction || auction.state !== "LIVE") return;

      const players = await Player.find({ auctionId }).sort({ index: 1 });
      const currentPlayer = players[auction.currentPlayerIndex];
      if (!currentPlayer || currentPlayer.status === "SOLD" || currentPlayer.status === "UNSOLD") return;

      if (amount <= (currentPlayer.currentBid || 0)) return;

      const team = await Team.findOne({ auctionId, name: teamName });
      if (!team || team.budget < amount) return;

      currentPlayer.currentBid = amount;
      currentPlayer.currentBidder = teamName;
      currentPlayer.status = "LIVE";
      await currentPlayer.save();

      io.to(`auction_${auctionId}`).emit("bid_accepted", {
        playerIndex: auction.currentPlayerIndex,
        amount,
        teamName,
        playerName: currentPlayer.name,
      });

      startOnlineTimer(auctionId, 10, io);
    } catch (err) {
      logger.error(`online_bid error: ${err.message}`);
    }
  });

  // ── ORGANIZER: Queue next player ─────────────────────────────────
  socket.on("organizer_set_player", async ({ auctionId, playerIndex }) => {
    if (!auctionId || playerIndex === undefined) return;
    try {
      const auction = await Auction.findById(auctionId);
      if (!auction) return;

      const players = await Player.find({ auctionId }).sort({ index: 1 });
      if (playerIndex >= players.length) return;

      const targetPlayer = players[playerIndex];
      if (targetPlayer.status === "SOLD") return;

      auction.queuedPlayerIndex = playerIndex;
      await auction.save();

      socket.emit("player_queued", { playerName: targetPlayer.name });
    } catch (err) {
      logger.error(`organizer_set_player error: ${err.message}`);
    }
  });

  // ── ORGANIZER: Force skip player ─────────────────────────────────
  socket.on("organizer_skip_player", async ({ auctionId }) => {
    if (!auctionId) return;
    try {
      clearTimer(auctionId);

      const auction = await Auction.findById(auctionId);
      if (!auction) return;

      const players = await Player.find({ auctionId }).sort({ index: 1 });
      const currentPlayer = players[auction.currentPlayerIndex];

      if (currentPlayer && currentPlayer.status !== "SOLD") {
        currentPlayer.status = "UNSOLD";
        currentPlayer.currentBid = 0;
        currentPlayer.currentBidder = null;
        await currentPlayer.save();
      }

      io.to(`auction_${auctionId}`).emit("player_skipped", {
        playerIndex: auction.currentPlayerIndex,
        playerName: currentPlayer?.name,
      });

      setTimeout(() => advanceToNextPlayer(auctionId, io), 2000);
    } catch (err) {
      logger.error(`organizer_skip_player error: ${err.message}`);
    }
  });

  // ── TEAM MANAGER: Join lobby ─────────────────────────────────────
  socket.on("manager_join", async ({ auctionId, teamName }) => {
    if (!auctionId || !teamName) return;
    managerConnections.set(socket.id, { auctionId, teamName });
    io.to(`auction_${auctionId}`).emit("manager_status_change", { teamName, status: "Connected" });

    try {
      const auction = await Auction.findById(auctionId);
      if (auction && auction.state === "PAUSED") {
        const teams = await Team.find({ auctionId });

        const allOnline = teams.every(t => {
          if (!t.managerUsername) return true;
          for (const conn of managerConnections.values()) {
            if (conn.auctionId === auctionId && conn.teamName === t.name) return true;
          }
          return false;
        });

        if (allOnline) {
          await Auction.updateOne({ _id: auctionId }, { state: "RESUMING" });
          io.to(`auction_${auctionId}`).emit("auction_state", "RESUMING");

          let resumeSeconds = 10;
          io.to(`auction_${auctionId}`).emit("resume_countdown_tick", { seconds: resumeSeconds });

          const timerState = getTimerState(auctionId);
          clearTimer(auctionId);

          const rTimer = setInterval(async () => {
            resumeSeconds--;
            io.to(`auction_${auctionId}`).emit("resume_countdown_tick", { seconds: resumeSeconds });

            if (resumeSeconds <= 0) {
              clearInterval(rTimer);
              await Auction.updateOne({ _id: auctionId }, { state: "LIVE" });
              io.to(`auction_${auctionId}`).emit("auction_state", "LIVE");
              startOnlineTimer(auctionId, Math.max(timerState?.seconds || 15, 5), io);
            }
          }, 1000);

          auctionCountdowns.set(auctionId, { timer: rTimer, seconds: timerState?.seconds || 15 });
        }
      }
    } catch (err) {
      logger.error(`manager_join resume error: ${err.message}`);
    }
  });

  // ── TEAM MANAGER: Disconnect handling ───────────────────────────
  socket.on("disconnect", async () => {
    const mConn = managerConnections.get(socket.id);
    if (!mConn) return;

    const { auctionId, teamName } = mConn;
    managerConnections.delete(socket.id);
    io.to(`auction_${auctionId}`).emit("manager_status_change", { teamName, status: "Offline" });
    io.to(`auction_${auctionId}`).emit("team_quit_alert", { teamName });

    try {
      const auction = await Auction.findById(auctionId);
      if (auction && auction.state === "LIVE" && auction.biddingMode === "ONLINE") {
        clearTimer(auctionId);
        await Auction.updateOne({ _id: auctionId }, { state: "PAUSED" });
        io.to(`auction_${auctionId}`).emit("auction_state", "PAUSED");
      }
    } catch (err) {
      logger.error(`disconnect pause error: ${err.message}`);
    }
  });
};

module.exports = { registerOnlineAuctionEvents, managerConnections };
