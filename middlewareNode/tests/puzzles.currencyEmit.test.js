/**
 * Real-database integration test for routes/puzzles.js's
 * POST /puzzles/solved — specifically the currency-event emit.
 *
 * Scoped to the property this session's change needs proven:
 * authenticated puzzle completion creates a puzzle.solved ActionEvent,
 * while invalid/guest requests do not.
 */

const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");

jest.setTimeout(60000);

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({
    instance: { launchTimeout: 30000 },
  });
  await mongoose.connect(mongod.getUri() + "ystem");
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
  jest.restoreAllMocks();
});

jest.mock("passport", () => ({
  authenticate: (_strategy, _opts, callback) => (req, res, next) => {
    if (req.headers["x-test-guest"] === "true") {
      return callback(null, false, null);
    }

    req.user = req.__testUser;
    return next();
  },
}));

const express = require("express");
const request = require("supertest");
const puzzlesRouter = require("../src/routes/puzzles");
const ActionEvent = require("../src/models/actionEvent");
const puzzles = require("../src/models/puzzles");

const app = express();
app.use(express.json());

app.use((req, _res, next) => {
  if (req.headers["x-test-user-id"]) {
    req.__testUser = {
      _id: req.headers["x-test-user-id"],
      username: req.headers["x-test-username"],
    };
  }
  next();
});

app.use("/puzzles", puzzlesRouter);

async function waitForActionEvent(query, timeoutMs = 2000) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const event = await ActionEvent.findOne(query);

    if (event) {
      return event;
    }

    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  return null;
}

async function seedPuzzle(puzzleId) {
  await puzzles.create({
    puzzleId,
    FEN: "8/8/8/8/8/8/8/K6k w - - 0 1",
    moves: "a1a2",
  });
}

describe("POST /puzzles/solved — currency emit", () => {
  it("emits puzzle.solved for an authenticated puzzle completion", async () => {
    const userId = new mongoose.Types.ObjectId();
    const puzzleId = "test-puzzle-1";

    await seedPuzzle(puzzleId);

    const res = await request(app)
      .post("/puzzles/solved")
      .send({ puzzleId })
      .set("x-test-user-id", userId.toString())
      .set("x-test-username", "alice");

    expect(res.status).toBe(200);

    const stored = await waitForActionEvent({
      actionKey: "puzzle.solved",
    });

    expect(stored).not.toBeNull();
    expect(stored.eventId).toBe(`puzzle:${userId}:${puzzleId}`);
    expect(stored.userId.toString()).toBe(userId.toString());
    expect(stored.metadata).toEqual({ puzzleId });
  });

  it("does NOT emit when the puzzle does not exist", async () => {
    const userId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .post("/puzzles/solved")
      .send({ puzzleId: "does-not-exist" })
      .set("x-test-user-id", userId.toString())
      .set("x-test-username", "bob");

    expect(res.status).toBe(404);

    await new Promise((resolve) => setImmediate(resolve));

    expect(await ActionEvent.countDocuments({})).toBe(0);
  });

  it("does NOT emit when puzzleId is missing", async () => {
    const userId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .post("/puzzles/solved")
      .send({})
      .set("x-test-user-id", userId.toString())
      .set("x-test-username", "carol");

    expect(res.status).toBe(400);

    await new Promise((resolve) => setImmediate(resolve));

    expect(await ActionEvent.countDocuments({})).toBe(0);
  });

  it("does NOT emit for a guest request", async () => {
    const puzzleId = "guest-puzzle";

    await seedPuzzle(puzzleId);

    const res = await request(app)
      .post("/puzzles/solved")
      .send({ puzzleId })
      .set("x-test-guest", "true");

    expect(res.status).not.toBe(200);

    await new Promise((resolve) => setImmediate(resolve));

    expect(await ActionEvent.countDocuments({})).toBe(0);
  });
});
