/**
 * Auction Route Tests
 * Tests: init auction, sync state, list, search, analytics, end auction
 *
 * Run: npm test
 */

process.env.JWT_SECRET = "test_jwt_secret_for_tests_only";
process.env.MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/auctionx_test";
process.env.NODE_ENV = "test";

const request = require("supertest");
const mongoose = require("mongoose");
const { app } = require("../server");

// Helpers
let authToken = "";
let testAuctionId = "";
const testUser = {
  username: `auc_test_${Date.now()}`,
  email: `auc_test_${Date.now()}@example.com`,
  password: "Password123",
};

// Setup & Teardown
beforeAll(async () => {
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Register and login to get a token
  const registerRes = await request(app).post("/api/auth/register").send(testUser);
  authToken = registerRes.body.token;
});

afterAll(async () => {
  const User = require("../models/User");
  const Auction = require("../models/Auction");
  const Team = require("../models/Team");
  const Player = require("../models/player");
  await User.deleteMany({ email: testUser.email });
  if (testAuctionId) {
    await Auction.deleteMany({ _id: testAuctionId });
    await Team.deleteMany({ auctionId: testAuctionId });
    await Player.deleteMany({ auctionId: testAuctionId });
  }
  await mongoose.connection.close();
});

// INIT AUCTION
describe("POST /api/auction/init", () => {
  it("should create a new auction with valid data", async () => {
    const res = await request(app)
      .post("/api/auction/init")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        auctionSetup: {
          auctionName: "Test Cricket Auction",
          teamCount: 2,
          maxBudget: 10000,
          bidSteps: [100, 200, 500],
          biddingMode: "OFFLINE",
        },
        teamsState: [
          { name: "Team Alpha", budget: 10000, players: [] },
          { name: "Team Beta", budget: 10000, players: [] },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.auction).toBeDefined();
    expect(res.body.auction.auctionCode).toHaveLength(6);
    expect(res.body.teams).toHaveLength(2);
    testAuctionId = res.body.auction._id;
  });

  it("should reject auction creation without auth token", async () => {
    const res = await request(app).post("/api/auction/init").send({
      auctionSetup: { auctionName: "Unauthorized", teamCount: 2, maxBudget: 1000, bidSteps: [] },
      teamsState: [],
    });
    expect(res.status).toBe(401);
  });
});

// SYNC STATE
describe("GET /api/auction/:auctionId/sync", () => {
  it("should return full auction state for a valid auctionId", async () => {
    const res = await request(app).get(`/api/auction/${testAuctionId}/sync`);
    expect(res.status).toBe(200);
    expect(res.body.auctionSetup.auctionName).toBe("Test Cricket Auction");
    expect(res.body.teamsState).toHaveLength(2);
    expect(res.body.auctionState).toBe("UPCOMING");
  });

  it("should return 404 for a non-existent auction ID", async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).get(`/api/auction/${fakeId}/sync`);
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });
});

// LIST AUCTIONS
describe("GET /api/auction/list", () => {
  it("should return an array of auctions", async () => {
    const res = await request(app).get("/api/auction/list");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});

// SEARCH AUCTION
describe("GET /api/auction/search", () => {
  it("should find auction by name", async () => {
    const res = await request(app).get("/api/auction/search?q=Test+Cricket+Auction");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].auctionName).toMatch(/Test Cricket Auction/i);
  });

  it("should return empty array for non-matching query", async () => {
    const res = await request(app).get("/api/auction/search?q=nonexistentauctionXYZ999");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  it("should return empty array for empty query", async () => {
    const res = await request(app).get("/api/auction/search?q=");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });
});

// END AUCTION
describe("POST /api/auction/end", () => {
  it("should end the auction and archive it", async () => {
    const res = await request(app)
      .post("/api/auction/end")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ auctionId: testAuctionId });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/archived/i);
  });

  it("should reject ending an already-ended auction", async () => {
    const res = await request(app)
      .post("/api/auction/end")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ auctionId: testAuctionId });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already ended/i);
  });

  it("should reject ending auction without auth", async () => {
    const res = await request(app)
      .post("/api/auction/end")
      .send({ auctionId: testAuctionId });
    expect(res.status).toBe(401);
  });
});

// ANALYTICS
describe("GET /api/auction/:id/analytics", () => {
  it("should return analytics for an ended auction", async () => {
    const res = await request(app).get(`/api/auction/${testAuctionId}/analytics`);
    expect(res.status).toBe(200);
    expect(res.body.auctionName).toBe("Test Cricket Auction");
    expect(res.body.state).toBe("ENDED");
  });

  it("should return 404 for unknown auction", async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).get(`/api/auction/${fakeId}/analytics`);
    expect(res.status).toBe(404);
  });
});
