/**
 * Integration tests — challenge accept persists a PvpGame, and
 * GET /challenge/game/:gameId verifies a joining player against it.
 *
 * See the PvP results plan (v2), T1 and T2. Uses mongodb-memory-server + the
 * real PvpGame model (no mocks) so the unique-index and lookup behavior is
 * verified directly, matching the pattern in tests/badges.concurrency.test.js.
 * requireAuth is mocked the same way tests/gameResults.test.js does it: the
 * caller's username comes from an x-test-user header instead of a real JWT.
 */

jest.mock("../src/middleware/requireAuth", () => (req, res, next) => {
  const username = req.headers["x-test-user"];
  if (!username) return res.status(401).json({ error: "Unauthorized" });
  req.user = { username, role: "student" };
  next();
});

const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const express = require("express");
const request = require("supertest");

jest.setTimeout(60000);

let mongod;
let app;
let challenge;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { launchTimeout: 30000 } });
  await mongoose.connect(mongod.getUri() + "ystem");

  challenge = require("../src/routes/challenge");
  app = express();
  app.use(express.json());
  app.use("/challenge", challenge);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  challenge._reset();
  const collections = mongoose.connection.collections;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
});

/**
 * Creates and accepts a challenge, returning its gameId. Both calls now need
 * an identity header: POST /challenge requires the caller to be fromUsername,
 * and only the recipient (toUsername) may accept.
 */
async function acceptedGame(fromUsername = "alice", toUsername = "bob") {
  const created = await request(app)
    .post("/challenge")
    .set("x-test-user", fromUsername)
    .send({ fromUsername, toUsername });
  const accept = await request(app)
    .post(`/challenge/${created.body.challengeId}/accept`)
    .set("x-test-user", toUsername);
  return { challengeId: created.body.challengeId, gameId: accept.body.gameId, accept };
}

describe("POST /challenge/:id/accept — persists a PvpGame", () => {
  test("accept creates exactly one PvpGame with white=challenger, black=opponent", async () => {
    const { gameId } = await acceptedGame("alice", "bob");

    const PvpGame = require("../src/models/PvpGame");
    const docs = await PvpGame.find({ gameId });
    expect(docs).toHaveLength(1);
    expect(docs[0].white).toBe("alice");
    expect(docs[0].black).toBe("bob");
    expect(docs[0].status).toBe("active");
  });

  test("a second accept of the same challenge returns 409 and creates no extra PvpGame", async () => {
    const { challengeId, gameId } = await acceptedGame("alice", "bob");

    const second = await request(app)
      .post(`/challenge/${challengeId}/accept`)
      .set("x-test-user", "bob");
    expect(second.status).toBe(409);

    const PvpGame = require("../src/models/PvpGame");
    const docs = await PvpGame.find({ gameId });
    expect(docs).toHaveLength(1);
  });
});

describe("GET /challenge/game/:gameId", () => {
  test("200 — either player gets you/white/black/status", async () => {
    const { gameId } = await acceptedGame("alice", "bob");

    const asWhite = await request(app).get(`/challenge/game/${gameId}`).set("x-test-user", "alice");
    expect(asWhite.status).toBe(200);
    expect(asWhite.body).toEqual({ gameId, you: "alice", white: "alice", black: "bob", status: "active" });

    const asBlack = await request(app).get(`/challenge/game/${gameId}`).set("x-test-user", "bob");
    expect(asBlack.status).toBe(200);
    expect(asBlack.body.you).toBe("bob");
  });

  test("403 — a student who is not one of the two players", async () => {
    const { gameId } = await acceptedGame("alice", "bob");

    const res = await request(app).get(`/challenge/game/${gameId}`).set("x-test-user", "mallory");
    expect(res.status).toBe(403);
  });

  test("404 — an unknown gameId", async () => {
    const res = await request(app)
      .get("/challenge/game/00000000-0000-0000-0000-000000000000")
      .set("x-test-user", "alice");
    expect(res.status).toBe(404);
  });
});
