const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Auction = require("../models/Auction");

const JWT_SECRET = process.env.JWT_SECRET || "supersecretauctionkey2026";

/**
 * Protect route — verifies JWT and attaches req.user
 */
const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({ error: "Not authorized — no token" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error.message);
    return res.status(401).json({ error: "Not authorized — invalid token" });
  }
};

/**
 * Organizer-only middleware — checks if the current user is the auction organizer.
 * Expects auctionId in req.params or req.body.
 */
const organizerOnly = async (req, res, next) => {
  try {
    const auctionId = req.params.auctionId || req.body.auctionId;

    if (!auctionId) {
      return res.status(400).json({ error: "auctionId required" });
    }

    const auction = await Auction.findById(auctionId);
    if (!auction) {
      return res.status(404).json({ error: "Auction not found" });
    }

    const isMainOrganizer = auction.organizer.toString() === req.user._id.toString();
    const isCoOrganizer = auction.coOrganizers && auction.coOrganizers.some(
      id => id.toString() === req.user._id.toString()
    );

    if (!isMainOrganizer && !isCoOrganizer) {
      return res.status(403).json({ error: "Only the organizer or a co-organizer can perform this action" });
    }

    req.auction = auction;
    next();
  } catch (error) {
    console.error("organizerOnly error:", error.message);
    return res.status(500).json({ error: "Server error" });
  }
};

module.exports = { protect, organizerOnly };
