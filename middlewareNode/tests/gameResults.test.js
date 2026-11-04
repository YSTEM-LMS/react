/**
 * Integration tests — GET /gameResults
 *
 * The GameResults model is mocked; utils/studentStats is NOT, so the scoring
 * these tests assert is the real formula the leaderboard and analytics use.
 *
 * There is no player-facing POST to test here anymore — a student can't write
 * their own game result. See tests/internalGameResults.test.js for the chess
 * server's service-key-gated reporting path (POST /internal/gameResults), and
 * the "legacy POST is gone" case below for the 404 that replaces it.
 */

jest.mock("../src/middleware/requireAuth", () => (req, _res, next) => {
  req.user = { username: req.headers["x-test-user"] || "alice", role: "student" };
  next();
});
jest.mock("../src/models/gameResults");

const express = require("express");
const request = require("supertest");
const requireAuth = require("../src/middleware/requireAuth");
const gameResults = require("../src/routes/gameResults");
const GameResults = require("../src/models/gameResults");

const app = express();
app.use(express.json());
app.use("/gameResults", requireAuth, gameResults);

afterEach(() => jest.clearAllMocks());

const WIN_BODY = {
  gameId: "game-1",
  result: "win",
  reason: "checkmate",
  winnerUsername: "alice",
  loserUsername: "bob",
};

describe("POST /gameResults — legacy player-facing path is gone", () => {
  test("404 — a student token posting to the old route finds no route to match", async () => {
    const res = await request(app).post("/gameResults").send(WIN_BODY);
    expect(res.status).toBe(404);
  });
});

describe("GET /gameResults/:username", () => {
  test("computes W/D/L and the chess score on read", async () => {
    GameResults.find.mockResolvedValue([
      { players: ["alice", "bob"], result: "win", winnerUsername: "alice" },
      { players: ["alice", "carol"], result: "win", winnerUsername: "alice" },
      { players: ["alice", "bob"], result: "win", winnerUsername: "bob" },
      { players: ["alice", "carol"], result: "draw", winnerUsername: null },
    ]);

    const res = await request(app).get("/gameResults/alice");
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      wins: 2,
      draws: 1,
      losses: 1,
      gamesPlayed: 4,
      chessScore: 7, // 2 wins (6) + 1 draw (1) + 1 loss (0)
    });
  });

  test("a student with no games gets zeros, not nulls", async () => {
    GameResults.find.mockResolvedValue([]);
    const res = await request(app).get("/gameResults/newbie");
    expect(res.body.data).toEqual({
      wins: 0,
      draws: 0,
      losses: 0,
      gamesPlayed: 0,
      chessScore: 0,
    });
  });
});
