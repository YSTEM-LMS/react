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

// Realistic Lichess shape: opponent move, then solver move. The route only
// ever has to verify the solver's half ("e8g8" here) — see solverMoves() in
// src/routes/puzzles.js.
const SOLUTION_MOVES = "e1g1 e8g8";
const SOLVER_MOVES = ["e8g8"];

// A two-pair line (opponent, solver, opponent, solver), for the tests below
// that need more than one solver move to submit a partial/extra sequence.
const TWO_PAIR_MOVES = "e2e4 e7e5 g1f3 b8c6";
const TWO_PAIR_SOLVER_MOVES = ["e7e5", "b8c6"];

async function seedPuzzle(puzzleId, moves = SOLUTION_MOVES) {
  // Real documents use the capitalized schema field names (PuzzleId, Moves —
  // see src/models/puzzles.js) — using the lowercase request-body names here
  // instead would silently fail Mongoose's required-field validation.
  await puzzles.create({
    PuzzleId: puzzleId,
    FEN: "r3k2r/ppp2ppp/2n5/1B1p4/3P4/2P5/PP3PPP/R3K2R w KQkq - 0 1",
    Moves: moves,
  });
}

describe("POST /puzzles/solved — currency emit", () => {
  it("emits puzzle.solved when the submitted moves match the puzzle's solution", async () => {
    const userId = new mongoose.Types.ObjectId();
    const puzzleId = "test-puzzle-1";

    await seedPuzzle(puzzleId);

    // The real client (Puzzles.tsx) never submits the opponent's automatic
    // move — only the solver's own moves (playedMovesRef).
    const res = await request(app)
      .post("/puzzles/solved")
      .send({ puzzleId, moves: SOLVER_MOVES })
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

    // Opponent move, then the solver's promotion move. Puzzles.tsx's
    // handlePlayerMove accepts the move even if the player didn't specify
    // a promotion piece (playerAttemptedMove === expectedMove.substring(0,4)),
    // so the server has to accept that same shape or it would reject a
    // move the client UI itself already treated as solved.
    await seedPuzzle(puzzleId, "a2a3 e7e8q");

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

    await seedPuzzle(puzzleId, "a2a3 e7e8q"); // solver promotes to queen

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
    // be rejected, not credited. Same length as the real solver move, wrong
    // square, so this is a content mismatch and not a length mismatch.
    const res = await request(app)
      .post("/puzzles/solved")
      .send({ puzzleId, moves: ["a7a8"] })
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

    await seedPuzzle(puzzleId, TWO_PAIR_MOVES); // solver has two moves

    const res = await request(app)
      .post("/puzzles/solved")
      .send({ puzzleId, moves: [TWO_PAIR_SOLVER_MOVES[0]] }) // only the first
      .set("x-test-user-id", userId.toString())
      .set("x-test-username", "frank");

    expect(res.status).toBe(400);

    await new Promise((resolve) => setImmediate(resolve));
    expect(await ActionEvent.countDocuments({})).toBe(0);
  });

  it("does NOT emit when the client submits the full line, including the opponent's moves", async () => {
    const userId = new mongoose.Types.ObjectId();
    const puzzleId = "test-puzzle-full-line";

    await seedPuzzle(puzzleId, TWO_PAIR_MOVES);

    // Submitting the whole stored answer key (as if the opponent's replies
    // were the player's own moves) must not be treated as a valid solve.
    const res = await request(app)
      .post("/puzzles/solved")
      .send({ puzzleId, moves: TWO_PAIR_MOVES.split(" ") })
      .set("x-test-user-id", userId.toString())
      .set("x-test-username", "judy");

    expect(res.status).toBe(400);

    await new Promise((resolve) => setImmediate(resolve));
    expect(await ActionEvent.countDocuments({})).toBe(0);
  });

  it("does NOT emit when extra moves are appended to an otherwise-correct solve", async () => {
    const userId = new mongoose.Types.ObjectId();
    const puzzleId = "test-puzzle-extra-moves";

    await seedPuzzle(puzzleId, TWO_PAIR_MOVES);

    const res = await request(app)
      .post("/puzzles/solved")
      .send({ puzzleId, moves: [...TWO_PAIR_SOLVER_MOVES, "a1a2"] })
      .set("x-test-user-id", userId.toString())
      .set("x-test-username", "karl");

    expect(res.status).toBe(400);

    await new Promise((resolve) => setImmediate(resolve));
    expect(await ActionEvent.countDocuments({})).toBe(0);
  });

  it.each([
    ["a single move with no opponent move at all", "e7e8q"],
    ["an odd number of moves", "e2e4 e7e5 g1f3"],
  ])("does NOT emit when the puzzle's stored Moves is malformed (%s)", async (_label, badMoves) => {
    const userId = new mongoose.Types.ObjectId();
    const puzzleId = "test-puzzle-malformed-moves";

    await seedPuzzle(puzzleId, badMoves);

    const res = await request(app)
      .post("/puzzles/solved")
      .send({ puzzleId, moves: ["e7e8"] })
      .set("x-test-user-id", userId.toString())
      .set("x-test-username", "liam");

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid/i);

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

  // Regression test for a casing bug: the route looked up puzzles by a
  // lowercase `puzzleId` field and read a lowercase `moves` field back off
  // the found document, but the real schema (src/models/puzzles.js) uses
  // PuzzleId / Moves. That made puzzles.findOne() never match (always a
  // false 404) and, separately, would have made movesMatch() always see an
  // empty expected-move list (always a false 400) even if the lookup were
  // fixed in isolation. This test builds the puzzle document directly with
  // the real capitalized fields and checks both outcomes of the full path.
  it("finds a real (PuzzleId/Moves) document, credits currency on a correct solve, and rejects a wrong one", async () => {
    const puzzleId = "test-puzzle-real-casing";
    await puzzles.create({
      PuzzleId: puzzleId,
      FEN: "r3k2r/ppp2ppp/2n5/1B1p4/3P4/2P5/PP3PPP/R3K2R w KQkq - 0 1",
      Moves: SOLUTION_MOVES,
    });

    const userId = new mongoose.Types.ObjectId();
    const correct = await request(app)
      .post("/puzzles/solved")
      .send({ puzzleId, moves: SOLVER_MOVES })
      .set("x-test-user-id", userId.toString())
      .set("x-test-username", "regression-tester");

    expect(correct.status).toBe(200);
    const credited = await waitForActionEvent({ actionKey: "puzzle.solved" });
    expect(credited).not.toBeNull();
    expect(credited.userId.toString()).toBe(userId.toString());

    const otherUserId = new mongoose.Types.ObjectId();
    const wrong = await request(app)
      .post("/puzzles/solved")
      .send({ puzzleId, moves: ["a7a8"] })
      .set("x-test-user-id", otherUserId.toString())
      .set("x-test-username", "regression-tester-2");

    expect(wrong.status).toBe(400);
  });
});
