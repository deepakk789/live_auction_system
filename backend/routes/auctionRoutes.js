const express = require("express");
const {
  setMode,
  nextPlayer,
  getUpcomingPlayers,
  updateBid,
  markSold,
  initAuction,
  uploadPlayers,
  syncState,
  resetAuction
} = require("../controllers/auctionController");

const router = express.Router();

router.post("/mode", setMode);
router.post("/next", nextPlayer);
router.get("/upcoming", getUpcomingPlayers);
router.post("/bid", updateBid);
router.post("/sold", markSold);

router.post("/init", initAuction);
router.post("/upload-players", uploadPlayers);
router.get("/sync", syncState);
router.post("/reset", resetAuction);

module.exports = router;
