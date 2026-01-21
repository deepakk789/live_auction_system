const express = require("express");
const {
  setMode,
  nextPlayer,
  getUpcomingPlayers
} = require("../controllers/auctionController");

const router = express.Router();

router.post("/mode", setMode);
router.post("/next", nextPlayer);
router.get("/upcoming", getUpcomingPlayers);

module.exports = router;

