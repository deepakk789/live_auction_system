const express = require("express");
const {
  setMode,
  nextPlayer
} = require("../controllers/auctionController");

const router = express.Router();

router.post("/mode", setMode);
router.post("/next", nextPlayer);

module.exports = router;
