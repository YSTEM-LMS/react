/**
 * Cross-service contract test — the chess server's result-report request
 * shape against the middleware's actual internal route. See the PvP results
 * plan (v2), T4b.
 *
 * This is the test that makes "the header name and path live in
 * resultRequest.js and nowhere else on the chess server side" actually true:
 * it imports that file directly from the chess server's source tree (CI
 * checks out the whole monorepo, so the relative require works even though
 * the two services are built into separate Docker images), builds a request
 * with it, and sends that exact request through the real middleware route —
 * real requireServiceKey, real PvpGame/GameResults models via
 * mongodb-memory-server, nothing mocked. If either side changes the header
 * name or the path without the other, this fails in CI instead of each
 * service's own tests passing in isolation (which is exactly how the
 * Authentication/Authorization header bug this plan fixes went unnoticed).
 */

const buildResultRequest = require("../../chessServer/src/reporting/resultRequest");

const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const express = require("express");
const request = require("supertest");

jest.setTimeout(60000);

const SERVICE_KEY = "contract-test-service-key";

let mongod;
let app;
let PvpGame;
let GameResults;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { launchTimeout: 30000 } });
  await mongoose.connect(mongod.getUri() + "ystem");

  process.env.CHESS_SERVICE_KEY = SERVICE_KEY;

  PvpGame = require("../src/models/PvpGame");
  GameResults = require("../src/models/gameResults");
  const internalGameResults = require("../src/routes/internalGameResults");

  app = express();
  app.use(express.json());
  app.use("/internal/gameResults", internalGameResults);
});

afterAll(async () => {
  delete process.env.CHESS_SERVICE_KEY;
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
});

/** Sends a { path, headers, body } request (as built by resultRequest.js) through supertest. */
function sendBuiltRequest({ path, headers, body }) {
  return request(app).post(path).set(headers).send(body);
}

describe("resultRequest.js output against the real /internal/gameResults route", () => {
  test("happy path — a real chess-server-shaped request is accepted and stored once", async () => {
    await PvpGame.create({ gameId: "contract-g1", white: "alice", black: "bob" });

    const game = { gameId: "contract-g1", players: [{ username: "alice" }, { username: "bob" }] };
    const outcome = { reason: "checkmate", winnerUsername: "bob", loserUsername: "alice" };
    const built = buildResultRequest(game, outcome, SERVICE_KEY);

    const res = await sendBuiltRequest(built);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.gameResult.source).toBe("chessServer");

    const stored = await GameResults.find({ gameId: "contract-g1" });
    expect(stored).toHaveLength(1);
    expect(stored[0].winnerUsername).toBe("bob");
  });

  test("a draw-shaped request is also accepted", async () => {
    await PvpGame.create({ gameId: "contract-g2", white: "alice", black: "bob" });

    const game = { gameId: "contract-g2", players: [{ username: "alice" }, { username: "bob" }] };
    const outcome = { reason: "draw" }; // no winnerUsername => resultRequest builds a draw
    const built = buildResultRequest(game, outcome, SERVICE_KEY);

    const res = await sendBuiltRequest(built);

    expect(res.status).toBe(201);
    expect(res.body.gameResult.result).toBe("draw");
  });

  test("wrong key — proves the service-key check actually runs, not just the happy path", async () => {
    await PvpGame.create({ gameId: "contract-g3", white: "alice", black: "bob" });

    const game = { gameId: "contract-g3", players: [{ username: "alice" }, { username: "bob" }] };
    const outcome = { reason: "checkmate", winnerUsername: "alice", loserUsername: "bob" };
    const built = buildResultRequest(game, outcome, "a-completely-wrong-key");

    const res = await sendBuiltRequest(built);

    expect(res.status).toBe(401);
    const stored = await GameResults.find({ gameId: "contract-g3" });
    expect(stored).toHaveLength(0);
  });
});
