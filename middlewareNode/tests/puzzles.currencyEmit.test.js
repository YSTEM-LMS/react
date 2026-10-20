/**
 * Real-database integration test for routes/puzzles.js's
 * POST /puzzles/solved — specifically the currency-event emit.
 *
 * Scoped to the property this session's change needs proven:
 * authenticated puzzle completion creates a puzzle.solved ActionEvent,
 * while invalid/guest requests do not — AND, critically, that completion
 * actually requires submitting the puzzle's real solution. The route
 * originally accepted a bare puzzleId with no proof of solving it; these
 * tests include the regression coverage for that (see "does NOT emit when
 * submitted moves don't match the puzzle's solution" below).
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

const SOLUTION_MOVES = "e1g1 e8g8";

async function seedPuzzle(puzzleId, moves = SOLUTION_MOVES) {
  await puzzles.create({
    puzzleId,
    FEN: "r3k2r/ppp2ppp/2n5/1B1p4/3P4/2P5/PP3PPP/R3K2R w KQkq - 0 1",
    moves,
  });
}

describe("POST /puzzles/solved — currency emit", () => {
  it("emits puzzle.solved when the submitted moves match the puzzle's solution", async () => {
    const userId = new mongoose.Types.ObjectId();
    const puzzleId = "test-puzzle-1";

    await seedPuzzle(puzzleId);

    const res = await request(app)
      .post("/puzzles/solved")
      .send({ puzzleId, moves: ["e1g1", "e8g8"] })
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

  it("accepts a 4-char submitted move against a 5-char (promotion) solution, matching the client's own leniency", async () => {
    const userId = new mongoose.Types.ObjectId();
    const puzzleId = "test-puzzle-promo-lenient";

    // Solution requires promoting to a queen; Puzzles.tsx's
    // handlePlayerMove accepts the move even if the player didn't specify
    // a promotion piece (playerAttemptedMove === expectedMove.substring(0,4)),
    // so the server has to accept that same shape or it would reject a
    // move the client UI itself already treated as solved.
    await seedPuzzle(puzzleId, "e7e8q");

    const res = await request(app)
      .post("/puzzles/solved")
      .send({ puzzleId, moves: ["e7e8"] })
      .set("x-test-user-id", userId.toString())
      .set("x-test-username", "dave");

    expect(res.status).toBe(200);
  });

  it("rejects the wrong promotion piece even though the first 4 chars match", async () => {
    const userId = new mongoose.Types.ObjectId();
    const puzzleId = "test-puzzle-wrong-promo";

    await seedPuzzle(puzzleId, "e7e8q"); // solution promotes to queen

    const res = await request(app)
      .post("/puzzles/solved")
      .send({ puzzleId, moves: ["e7e8r"] }) // submitted promotes to rook
      .set("x-test-user-id", userId.toString())
      .set("x-test-username", "ivan");

    expect(res.status).toBe(400);
  });

  it("does NOT emit when the submitted moves don't match the puzzle's solution", async () => {
    const userId = new mongoose.Types.ObjectId();
    const puzzleId = "test-puzzle-wrong-moves";

    await seedPuzzle(puzzleId);

    // This is the regression case: a caller who knows (or guesses) a real
    // puzzleId but never actually played — or played incorrectly — must
    // be rejected, not credited.
    const res = await request(app)
      .post("/puzzles/solved")
      .send({ puzzleId, moves: ["a1a2", "a7a8"] })
      .set("x-test-user-id", userId.toString())
      .set("x-test-username", "eve");

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/do not match/i);

    await new Promise((resolve) => setImmediate(resolve));
    expect(await ActionEvent.countDocuments({})).toBe(0);
  });

  it("does NOT emit when fewer moves are submitted than the solution requires", async () => {
    const userId = new mongoose.Types.ObjectId();
    const puzzleId = "test-puzzle-partial";

    await seedPuzzle(puzzleId); // solution is two moves

    const res = await request(app)
      .post("/puzzles/solved")
      .send({ puzzleId, moves: ["e1g1"] }) // only the first move
      .set("x-test-user-id", userId.toString())
      .set("x-test-username", "frank");

    expect(res.status).toBe(400);

    await new Promise((resolve) => setImmediate(resolve));
    expect(await ActionEvent.countDocuments({})).toBe(0);
  });

  it("does NOT emit when moves is missing — a bare puzzleId is no longer sufficient", async () => {
    const userId = new mongoose.Types.ObjectId();
    const puzzleId = "test-puzzle-no-moves";

    await seedPuzzle(puzzleId);

    const res = await request(app)
      .post("/puzzles/solved")
      .send({ puzzleId })
      .set("x-test-user-id", userId.toString())
      .set("x-test-username", "grace");

    expect(res.status).toBe(400);

    await new Promise((resolve) => setImmediate(resolve));
    expect(await ActionEvent.countDocuments({})).toBe(0);
  });

  it("does NOT emit when moves is an empty array", async () => {
    const userId = new mongoose.Types.ObjectId();
    const puzzleId = "test-puzzle-empty-moves";

    await seedPuzzle(puzzleId);

    const res = await request(app)
      .post("/puzzles/solved")
      .send({ puzzleId, moves: [] })
      .set("x-test-user-id", userId.toString())
      .set("x-test-username", "heidi");

    expect(res.status).toBe(400);

    await new Promise((resolve) => setImmediate(resolve));
    expect(await ActionEvent.countDocuments({})).toBe(0);
  });

  it("does NOT emit when the puzzle does not exist", async () => {
    const userId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .post("/puzzles/solved")
      .send({ puzzleId: "does-not-exist", moves: ["e1g1", "e8g8"] })
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
      .send({ moves: ["e1g1", "e8g8"] })
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
      .send({ puzzleId, moves: ["e1g1", "e8g8"] })
      .set("x-test-guest", "true");

    expect(res.status).not.toBe(200);

    await new Promise((resolve) => setImmediate(resolve));

    expect(await ActionEvent.countDocuments({})).toBe(0);
  });
});
