/**
 * Real-database consistency test — LB-02, rewritten for the currency
 * rollout's leaderboard swap.
 *
 * Previously this test proved /leaderboard's score and /analytics's raw
 * stats came from the same weighted-formula computation — both routes
 * imported the same utils/studentStats helpers, and a discrepancy would
 * mean that shared module had been bypassed or duplicated. That coupling
 * is now gone on purpose: /leaderboard's score comes from
 * UserBalance.lifetimeEarned (services/ledgerService.js), while /analytics
 * still reports the old engagement stats directly. They are now two
 * different signals by design (see routes/leaderboard.js's module
 * header) — reasserting the old cross-endpoint equality would be
 * asserting a coupling this swap was built to remove.
 *
 * What this file verifies instead: /leaderboard's score is genuinely
 * sourced from the real ledger, not a stale in-memory computation —
 * using real Mongoose models (UserBalance, Users), not mocks, since the
 * property under test is "the route reads what's actually in the
 * database," which a mock can't demonstrate.
 */

const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const express = require("express");
const request = require("supertest");

jest.setTimeout(60000);

let mongod;
let app;

beforeAll(async () => {
  // See badges.concurrency.test.js for why launchTimeout is raised — this
  // file and that one are both real-Mongo tests and can run as concurrent
  // Jest workers, contending for resources under the 10s default.
  mongod = await MongoMemoryServer.create({ instance: { launchTimeout: 30000 } });
  await mongoose.connect(mongod.getUri() + "ystem");

  const requireAuth = (req, res, next) => { req.user = { username: "alice", role: "student" }; next(); };
  const leaderboardRoute = require("../src/routes/leaderboard");

  app = express();
  app.use(express.json());
  app.use("/leaderboard", requireAuth, leaderboardRoute);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
});

describe("LB-02 — leaderboard score reflects the real currency ledger", () => {
  test("a student's leaderboard score matches their real UserBalance.lifetimeEarned", async () => {
    const Users = require("../src/models/users");
    const UserBalance = require("../src/models/userBalance");

    const alice = await Users.create({
      username: "alice", email: "alice@test.com", password: "hashed",
      firstName: "Alice", lastName: "Test", role: "student", school: "Test School",
    });
    await UserBalance.create({ userId: alice._id, balance: 42, lifetimeEarned: 42 });

    const res = await request(app).get("/leaderboard?school=" + encodeURIComponent("Test School"));
    expect(res.status).toBe(200);

    const aliceEntry = res.body.data.leaderboard.find((e) => e.username === "alice");
    expect(aliceEntry).toBeDefined();
    expect(aliceEntry.score).toBe(42);
  });

  test("a student with no UserBalance document shows score 0, not omitted or undefined", async () => {
    const Users = require("../src/models/users");
    await Users.create({
      username: "quiet", email: "quiet@test.com", password: "hashed",
      firstName: "Quiet", lastName: "Student", role: "student", school: "Silent School",
    });

    const res = await request(app).get("/leaderboard?school=" + encodeURIComponent("Silent School"));
    const quietEntry = res.body.data.leaderboard.find((e) => e.username === "quiet");

    expect(quietEntry).toBeDefined();
    expect(quietEntry.score).toBe(0);
  });

  test("score reflects lifetimeEarned, not spendable balance — the two diverge once currency is spent", async () => {
    const Users = require("../src/models/users");
    const UserBalance = require("../src/models/userBalance");

    const bob = await Users.create({
      username: "bob", email: "bob@test.com", password: "hashed",
      firstName: "Bob", lastName: "Test", role: "student", school: "Spend Test School",
    });
    // Simulates a student who earned 100 total but has since spent some —
    // balance (spendable) is lower than lifetimeEarned (monotonic). This
    // scenario doesn't exist yet in production (no spend path this
    // window), but the leaderboard must already be reading the field that
    // stays correct once one ships.
    await UserBalance.create({ userId: bob._id, balance: 30, lifetimeEarned: 100 });

    const res = await request(app).get("/leaderboard?school=" + encodeURIComponent("Spend Test School"));
    const bobEntry = res.body.data.leaderboard.find((e) => e.username === "bob");

    expect(bobEntry.score).toBe(100); // lifetimeEarned, not the lower balance of 30
  });

  test("ranking order follows real lifetimeEarned across multiple students", async () => {
    const Users = require("../src/models/users");
    const UserBalance = require("../src/models/userBalance");

    const low = await Users.create({ username: "low", email: "low@test.com", password: "h", firstName: "L", lastName: "L", role: "student", school: "Rank School" });
    const high = await Users.create({ username: "high", email: "high@test.com", password: "h", firstName: "H", lastName: "H", role: "student", school: "Rank School" });
    const none = await Users.create({ username: "none", email: "none@test.com", password: "h", firstName: "N", lastName: "N", role: "student", school: "Rank School" });

    await UserBalance.create({ userId: low._id, balance: 5, lifetimeEarned: 5 });
    await UserBalance.create({ userId: high._id, balance: 50, lifetimeEarned: 50 });
    // "none" has no UserBalance document at all.

    const res = await request(app).get("/leaderboard?school=" + encodeURIComponent("Rank School"));
    const order = res.body.data.leaderboard.map((e) => e.username);

    expect(order).toEqual(["high", "low", "none"]);
  });
});
