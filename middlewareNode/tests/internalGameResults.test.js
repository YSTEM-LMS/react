/**
 * Integration tests — POST /internal/gameResults
 *
 * The chess server's own reporting path (PvP results plan v2, T3). Models are
 * mocked here the same way tests/gameResults.test.js mocks GameResults — the
 * real-database equivalent of the happy path is covered end-to-end by
 * tests/contract.chessServerReport.test.js (T4b), which mounts this route for
 * real against mongodb-memory-server.
 */

jest.mock("../src/models/gameResults");
jest.mock("../src/models/PvpGame");

const express = require("express");
const request = require("supertest");
const internalGameResults = require("../src/routes/internalGameResults");
const GameResults = require("../src/models/gameResults");
const PvpGame = require("../src/models/PvpGame");

const app = express();
app.use(express.json());
app.use("/internal/gameResults", internalGameResults);

const SERVICE_KEY = "test-service-key";

beforeEach(() => {
  process.env.CHESS_SERVICE_KEY = SERVICE_KEY;
});

afterEach(() => {
  jest.clearAllMocks();
  delete process.env.CHESS_SERVICE_KEY;
});

const WIN_BODY = {
  gameId: "game-1",
  result: "win",
  reason: "checkmate",
  winnerUsername: "alice",
  loserUsername: "bob",
};

const ACTIVE_GAME = { gameId: "game-1", white: "alice", black: "bob", status: "active" };

describe("POST /internal/gameResults — service key", () => {
  test("401 — missing key", async () => {
    const res = await request(app).post("/internal/gameResults").send(WIN_BODY);
    expect(res.status).toBe(401);
  });

  test("401 — wrong key", async () => {
    const res = await request(app)
      .post("/internal/gameResults")
      .set("X-Service-Key", "wrong-key")
      .send(WIN_BODY);
    expect(res.status).toBe(401);
  });
});

describe("POST /internal/gameResults — game lookup and validation", () => {
  test("404 — unknown gameId", async () => {
    PvpGame.findOne.mockResolvedValue(null);

    const res = await request(app)
      .post("/internal/gameResults")
      .set("X-Service-Key", SERVICE_KEY)
      .send(WIN_BODY);
    expect(res.status).toBe(404);
  });

  test("400 — winner/loser do not match the accepted game's players", async () => {
    PvpGame.findOne.mockResolvedValue({ gameId: "game-1", white: "alice", black: "carol", status: "active" });

    const res = await request(app)
      .post("/internal/gameResults")
      .set("X-Service-Key", SERVICE_KEY)
      .send(WIN_BODY); // reports bob, not carol
    expect(res.status).toBe(400);
  });

  test("400 — invalid body never reaches the game lookup", async () => {
    const res = await request(app)
      .post("/internal/gameResults")
      .set("X-Service-Key", SERVICE_KEY)
      .send({ ...WIN_BODY, result: "forfeit" });
    expect(res.status).toBe(400);
    expect(PvpGame.findOne).not.toHaveBeenCalled();
  });
});

describe("POST /internal/gameResults — recording", () => {
  beforeEach(() => {
    PvpGame.findOne.mockResolvedValue({ ...ACTIVE_GAME });
    PvpGame.updateOne.mockResolvedValue({ acknowledged: true });
    GameResults.findOne.mockResolvedValue(null);
    GameResults.create.mockImplementation(async (doc) => doc);
  });

  test("201 — happy path stores source: chessServer", async () => {
    const res = await request(app)
      .post("/internal/gameResults")
      .set("X-Service-Key", SERVICE_KEY)
      .send(WIN_BODY);

    expect(res.status).toBe(201);
    expect(res.body.duplicate).toBe(false);
    expect(res.body.gameResult.source).toBe("chessServer");
    expect(GameResults.create).toHaveBeenCalledWith(
      expect.objectContaining({ gameId: "game-1", source: "chessServer" })
    );
    expect(PvpGame.updateOne).toHaveBeenCalledWith(
      { gameId: "game-1", status: "active" },
      { $set: expect.objectContaining({ status: "finished" }) }
    );
  });

  test("200 duplicate:true — second report for the same game writes nothing", async () => {
    GameResults.findOne.mockResolvedValue({ ...WIN_BODY, players: ["alice", "bob"], source: "chessServer" });

    const res = await request(app)
      .post("/internal/gameResults")
      .set("X-Service-Key", SERVICE_KEY)
      .send(WIN_BODY);

    expect(res.status).toBe(200);
    expect(res.body.duplicate).toBe(true);
    expect(GameResults.create).not.toHaveBeenCalled();
    expect(PvpGame.updateOne).not.toHaveBeenCalled();
  });

  test("a unique-index race is resolved as a duplicate, not a 500", async () => {
    GameResults.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...WIN_BODY, players: ["alice", "bob"], source: "chessServer" });
    GameResults.create.mockRejectedValue({ code: 11000 });

    const res = await request(app)
      .post("/internal/gameResults")
      .set("X-Service-Key", SERVICE_KEY)
      .send(WIN_BODY);

    expect(res.status).toBe(200);
    expect(res.body.duplicate).toBe(true);
  });
});
