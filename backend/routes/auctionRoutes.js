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
  resetAuction,
  listAuctions,
  endAuction,
  getAuctionAnalytics,
  searchAuction,
  getAuctionByCode,
  addCoOrganizer,
  removeCoOrganizer,
  claimOrganizerLock,
  releaseOrganizerLock
} = require("../controllers/auctionController");

const { protect, organizerOnly } = require("../middleware/authMiddleware");

const router = express.Router();

// Public routes
router.get("/list", listAuctions);
router.get("/search", searchAuction);
router.get("/code/:code", getAuctionByCode);
router.get("/:auctionId/sync", syncState);
router.get("/:id/analytics", getAuctionAnalytics);
router.get("/upcoming", getUpcomingPlayers);

// Protected routes (require auth)
router.post("/init", protect, initAuction);
router.post("/upload-players", protect, uploadPlayers);
router.post("/mode", protect, setMode);
router.post("/next", protect, nextPlayer);
router.post("/bid", protect, updateBid);
router.post("/sold", protect, markSold);
router.post("/reset", protect, resetAuction);
router.post("/end", protect, endAuction);

// Multi-organizer routes
router.post("/:auctionId/co-organizer", protect, organizerOnly, addCoOrganizer);
router.delete("/:auctionId/co-organizer/:userId", protect, organizerOnly, removeCoOrganizer);
router.post("/:auctionId/claim-lock", protect, organizerOnly, claimOrganizerLock);
router.post("/:auctionId/release-lock", protect, organizerOnly, releaseOrganizerLock);

module.exports = router;
