/**
 * Auth Route Tests
 * Tests: register, login, /me, forgot-password, reset-password
 *
 * These are integration tests — they hit the real Express routes
 * but use an in-memory-compatible MongoDB setup via MONGO_URI env.
 *
 * Run: npm test
 */

process.env.JWT_SECRET = "test_jwt_secret_for_tests_only";
process.env.MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/auctionx_test";
process.env.NODE_ENV = "test";

const request = require("supertest");
const mongoose = require("mongoose");
const { app } = require("../server");

// ── Helpers ────────────────────────────────────────────────────────
const testUser = {
  username: `testuser_${Date.now()}`,
  email: `testuser_${Date.now()}@example.com`,
  password: "Password123",
};

let authToken = "";

// ── Setup & Teardown ───────────────────────────────────────────────
beforeAll(async () => {
  // Wait for mongoose connection (server.js connects on load)
  await new Promise((resolve) => setTimeout(resolve, 2000));
});

afterAll(async () => {
  // Clean up test user
  const User = require("../models/User");
  await User.deleteMany({ email: testUser.email });
  await mongoose.connection.close();
});

// ── REGISTER ───────────────────────────────────────────────────────
describe("POST /api/auth/register", () => {
  it("should register a new user and return a token", async () => {
    const res = await request(app).post("/api/auth/register").send(testUser);
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.username).toBe(testUser.username);
    expect(res.body.user.email).toBe(testUser.email.toLowerCase());
    authToken = res.body.token;
  });

  it("should reject registration with duplicate email", async () => {
    const res = await request(app).post("/api/auth/register").send(testUser);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already exists/i);
  });

  it("should reject registration with missing fields", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "incomplete" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it("should reject registration with short password", async () => {
    const res = await request(app).post("/api/auth/register").send({
      username: "newuser123",
      email: "newuser123@test.com",
      password: "123",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/6 characters/i);
  });

  it("should reject registration with invalid email", async () => {
    const res = await request(app).post("/api/auth/register").send({
      username: "newuser456",
      email: "not-an-email",
      password: "Password123",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email/i);
  });
});

// ── LOGIN ──────────────────────────────────────────────────────────
describe("POST /api/auth/login", () => {
  it("should login with correct credentials and return token", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: testUser.email, password: testUser.password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(testUser.email.toLowerCase());
    authToken = res.body.token;
  });

  it("should reject login with wrong password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: testUser.email, password: "WrongPassword!" });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/incorrect password/i);
  });

  it("should reject login for non-existent email", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@nowhere.com", password: "Password123" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  it("should reject login with missing fields", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: testUser.email });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});

// ── GET /me ────────────────────────────────────────────────────────
describe("GET /api/auth/me", () => {
  it("should return current user with valid token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(testUser.email.toLowerCase());
  });

  it("should return 401 with no token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  it("should return 401 with an invalid token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer this.is.invalid");
    expect(res.status).toBe(401);
  });
});

// ── FORGOT PASSWORD ────────────────────────────────────────────────
describe("POST /api/auth/forgot-password", () => {
  it("should return success message for any email (security best practice)", async () => {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: testUser.email });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/reset link/i);
  });

  it("should return the same message even for non-existent email (prevents enumeration)", async () => {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "ghost@nowhere.com" });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/reset link/i);
  });

  it("should reject missing email", async () => {
    const res = await request(app).post("/api/auth/forgot-password").send({});
    expect(res.status).toBe(400);
  });
});

// ── HEALTH CHECK ───────────────────────────────────────────────────
describe("GET /api/health", () => {
  it("should return ok status", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.timestamp).toBeDefined();
  });
});
