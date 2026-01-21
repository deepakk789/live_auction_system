const express = require("express");
const {
  setMode,
  nextPlayer,
  getUpcomingPlayers,
  updateBid,
  markSold
} = require("../controllers/auctionController");

const router = express.Router();

router.post("/mode", setMode);
router.post("/next", nextPlayer);
router.get("/upcoming", getUpcomingPlayers);
router.post("/bid", updateBid);
router.post("/sold", markSold);

module.exports = router;
