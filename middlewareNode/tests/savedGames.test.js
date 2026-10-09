/**
 * Saved games (Phase A) — routes/savedGames.js + services/savedGames.js
 *
 * Runs against a real in-memory MongoDB and the real login check: tokens are
 * signed with the same indexKey and verified by the same passport JWT
 * strategy the server uses (config/passport.js), and requireAuth is mounted
 * exactly as in server.js. Nothing about authentication is mocked, so the
 * 401 tests prove the routes are actually protected.
 */

const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const express = require("express");
const passport = require("passport");
const request = require("supertest");
const jwt = require("jsonwebtoken");
const config = require("config");

require("../src/config/passport");
const requireAuth = require("../src/middleware/requireAuth");
const savedGamesRouter = require("../src/routes/savedGames");
const SavedGame = require("../src/models/savedGame");
const Users = require("../src/models/users");
const { LIMITS } = require("../src/services/savedGames");

jest.setTimeout(60000);

const app = express();
app.use(express.json());
app.use(passport.initialize());
app.use("/savedGames", requireAuth, savedGamesRouter);

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
// Fool's mate: black mates white on move 2.
const FOOLS_MATE = "1. f3 e5 2. g4 Qh4#";

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { launchTimeout: 30000 } });
  await mongoose.connect(mongod.getUri() + "ystem");
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
});

async function makeUser(username, role = "student", mentorshipUsername = "") {
  await Users.create({
    username,
    email: `${username}@example.com`,
    password: "x",
    firstName: username,
    lastName: "Test",
    role,
    mentorshipUsername,
  });
  return jwt.sign({ username, role }, config.get("indexKey"));
}

const auth = (token) => ({ Authorization: `Bearer ${token}` });

async function createGame(token, body = {}) {
  return request(app)
    .post("/savedGames")
    .set(auth(token))
    .send({ playerColor: "white", computerLevel: 10, ...body });
}

describe("authentication", () => {
  test.each([
    ["get", "/savedGames"],
    ["post", "/savedGames"],
    ["get", "/savedGames/00000000-0000-4000-8000-000000000000"],
    ["patch", "/savedGames/00000000-0000-4000-8000-000000000000"],
    ["delete", "/savedGames/00000000-0000-4000-8000-000000000000"],
  ])("%s %s returns 401 without a login token", async (method, path) => {
    const res = await request(app)[method](path);
    expect(res.status).toBe(401);
  });

  test("returns 401 for a token signed with the wrong key", async () => {
    await makeUser("alice");
    const forged = jwt.sign({ username: "alice", role: "student" }, "not-the-key");
    const res = await request(app).get("/savedGames").set(auth(forged));
    expect(res.status).toBe(401);
  });
});

describe("POST /savedGames", () => {
  test("creates a computer game owned by the caller", async () => {
    const token = await makeUser("alice");
    const res = await createGame(token, { playerColor: "black", computerLevel: 5 });

    expect(res.status).toBe(201);
    expect(res.body.game).toMatchObject({
      gameType: "computer",
      gameName: "Me vs Computer",
      playerColor: "black",
      computerLevel: 5,
      startFen: START,
      fen: START,
      pgn: "",
      plyCount: 0,
      status: "ongoing",
      endReason: null,
      notes: [],
    });
    expect(res.body.game.uuid).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.body.game).not.toHaveProperty("userId");
    expect(res.body.game).not.toHaveProperty("_id");

    const alice = await Users.findOne({ username: "alice" });
    const stored = await SavedGame.findOne({ uuid: res.body.game.uuid });
    expect(String(stored.userId)).toBe(String(alice._id));
  });

  test("ignores an owner, status or game type sent in the body", async () => {
    const token = await makeUser("alice");
    const bob = await Users.create({
      username: "bob", email: "bob@example.com", password: "x",
      firstName: "Bob", lastName: "Test", role: "student",
    });
    const res = await createGame(token, {
      userId: String(bob._id),
      status: "won",
      endReason: "checkmate",
      gameType: "pvp",
    });

    expect(res.status).toBe(201);
    expect(res.body.game.status).toBe("ongoing");
    expect(res.body.game.gameType).toBe("computer");
    const stored = await SavedGame.findOne({ uuid: res.body.game.uuid });
    expect(String(stored.userId)).not.toBe(String(bob._id));
  });

  test.each([
    [{ playerColor: "red" }, /playerColor/],
    [{ computerLevel: 21 }, /computerLevel/],
    [{ computerLevel: "10" }, /computerLevel/],
    [{ startFen: "not a fen" }, /startFen/],
    [{ gameName: "x".repeat(81) }, /gameName/],
  ])("rejects invalid settings %j with 400", async (override, message) => {
    const token = await makeUser("alice");
    const res = await createGame(token, override);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(message);
  });

  test("returns 409 once the per-student game limit is reached", async () => {
    const token = await makeUser("alice");
    const original = LIMITS.maxGamesPerUser;
    LIMITS.maxGamesPerUser = 2;
    try {
      expect((await createGame(token)).status).toBe(201);
      expect((await createGame(token)).status).toBe(201);
      const res = await createGame(token);
      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/up to 2 games/);
    } finally {
      LIMITS.maxGamesPerUser = original;
    }
  });
});

describe("PATCH /savedGames/:uuid — moves", () => {
  test("replays a legal PGN and derives the position on the server", async () => {
    const token = await makeUser("alice");
    const { uuid } = (await createGame(token)).body.game;

    const res = await request(app)
      .patch(`/savedGames/${uuid}`)
      .set(auth(token))
      .send({ pgn: "1. e4 e5 2. Nf3", fen: "8/8/8/8/8/8/8/8 w - - 0 1" });

    expect(res.status).toBe(200);
    expect(res.body.game.plyCount).toBe(3);
    expect(res.body.game.fen).toBe(
      "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2"
    );
    expect(res.body.game.status).toBe("ongoing");
  });

  test("returns 400 for an illegal move and leaves the game unchanged", async () => {
    const token = await makeUser("alice");
    const { uuid } = (await createGame(token)).body.game;
    await request(app).patch(`/savedGames/${uuid}`).set(auth(token)).send({ pgn: "1. e4" });

    const res = await request(app)
      .patch(`/savedGames/${uuid}`)
      .set(auth(token))
      .send({ pgn: "1. e4 e5 2. Ke3" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/illegal/);
    const stored = await SavedGame.findOne({ uuid });
    expect(stored.plyCount).toBe(1);
  });

  test("returns 400 for a PGN that starts from a different position", async () => {
    const token = await makeUser("alice");
    const { uuid } = (await createGame(token)).body.game;

    const res = await request(app)
      .patch(`/savedGames/${uuid}`)
      .set(auth(token))
      .send({ pgn: '[SetUp "1"]\n[FEN "4k3/8/8/8/8/8/8/4K2R w K - 0 1"]\n\n1. O-O' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/starting position/);
  });

  test("stores the server's own PGN, dropping client headers and comments", async () => {
    const token = await makeUser("alice");
    const { uuid } = (await createGame(token)).body.game;

    const res = await request(app)
      .patch(`/savedGames/${uuid}`)
      .set(auth(token))
      .send({ pgn: '[Event "<script>alert(1)</script>"]\n\n1. e4 {hello there} e5' });

    expect(res.status).toBe(200);
    expect(res.body.game.pgn).not.toMatch(/script|hello/);
    expect(res.body.game.pgn).toMatch(/1\. e4 e5/);
  });

  test("returns 400 when a game is over the move limit", async () => {
    const token = await makeUser("alice");
    const { uuid } = (await createGame(token)).body.game;
    const original = LIMITS.maxPlies;
    LIMITS.maxPlies = 4;
    try {
      const res = await request(app)
        .patch(`/savedGames/${uuid}`)
        .set(auth(token))
        .send({ pgn: "1. Nf3 Nf6 2. Ng1 Ng8 3. Nf3" });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/limited to 4 moves/);
    } finally {
      LIMITS.maxPlies = original;
    }
  });

  test("returns 400 for an oversized PGN without parsing it", async () => {
    const token = await makeUser("alice");
    const { uuid } = (await createGame(token)).body.game;
    const res = await request(app)
      .patch(`/savedGames/${uuid}`)
      .set(auth(token))
      .send({ pgn: "1. e4 ".repeat(5000) });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/too long/);
  });

  test("accepts a shorter PGN, so undo is saved too", async () => {
    const token = await makeUser("alice");
    const { uuid } = (await createGame(token)).body.game;
    await request(app).patch(`/savedGames/${uuid}`).set(auth(token)).send({ pgn: "1. e4 e5 2. Nf3 Nc6" });

    const res = await request(app).patch(`/savedGames/${uuid}`).set(auth(token)).send({ pgn: "1. e4 e5" });
    expect(res.status).toBe(200);
    expect(res.body.game.plyCount).toBe(2);
  });
});

describe("results are decided by the server", () => {
  test.each([
    ["white", "lost"],
    ["black", "won"],
  ])("checkmate with the player as %s is recorded as %s", async (playerColor, status) => {
    const token = await makeUser("alice");
    const { uuid } = (await createGame(token, { playerColor })).body.game;

    const res = await request(app)
      .patch(`/savedGames/${uuid}`)
      .set(auth(token))
      .send({ pgn: FOOLS_MATE, status: "won" });

    expect(res.status).toBe(200);
    expect(res.body.game).toMatchObject({ status, endReason: "checkmate", plyCount: 4 });
  });

  test("a draw by insufficient material is recorded as a draw", async () => {
    const token = await makeUser("alice");
    const { uuid } = (
      await createGame(token, { startFen: "k7/8/8/8/8/8/1r6/K7 w - - 0 1" })
    ).body.game;

    const res = await request(app)
      .patch(`/savedGames/${uuid}`)
      .set(auth(token))
      .send({ pgn: '[SetUp "1"]\n[FEN "k7/8/8/8/8/8/1r6/K7 w - - 0 1"]\n\n1. Kxb2' });

    expect(res.status).toBe(200);
    expect(res.body.game).toMatchObject({ status: "draw", endReason: "insufficient_material" });
  });

  test("a stalemate is recorded as a draw", async () => {
    const token = await makeUser("alice");
    const { uuid } = (
      await createGame(token, { startFen: "k7/8/1Q6/8/8/8/8/K7 w - - 0 1" })
    ).body.game;

    const res = await request(app)
      .patch(`/savedGames/${uuid}`)
      .set(auth(token))
      .send({ pgn: '[SetUp "1"]\n[FEN "k7/8/1Q6/8/8/8/8/K7 w - - 0 1"]\n\n1. Qc7' });

    expect(res.status).toBe(200);
    expect(res.body.game).toMatchObject({ status: "draw", endReason: "stalemate" });
  });

  test("the browser can resign, and a finished game's moves are then locked", async () => {
    const token = await makeUser("alice");
    const { uuid } = (await createGame(token)).body.game;

    const resign = await request(app)
      .patch(`/savedGames/${uuid}`)
      .set(auth(token))
      .send({ pgn: "1. e4", resign: true });
    expect(resign.status).toBe(200);
    expect(resign.body.game).toMatchObject({ status: "lost", endReason: "resign", plyCount: 1 });

    const moreMoves = await request(app)
      .patch(`/savedGames/${uuid}`)
      .set(auth(token))
      .send({ pgn: "1. e4 e5" });
    expect(moreMoves.status).toBe(409);

    const rename = await request(app)
      .patch(`/savedGames/${uuid}`)
      .set(auth(token))
      .send({ gameName: "My first loss" });
    expect(rename.status).toBe(200);
    expect(rename.body.game.gameName).toBe("My first loss");
  });

  test("resign only accepts true", async () => {
    const token = await makeUser("alice");
    const { uuid } = (await createGame(token)).body.game;
    const res = await request(app)
      .patch(`/savedGames/${uuid}`)
      .set(auth(token))
      .send({ resign: "yes" });
    expect(res.status).toBe(400);
  });
});

describe("access", () => {
  async function aliceGame() {
    const aliceToken = await makeUser("alice", "student", "mentorMo");
    const { uuid } = (await createGame(aliceToken)).body.game;
    return { aliceToken, uuid };
  }

  test("GET /savedGames lists only the caller's games, newest first, without moves", async () => {
    const { aliceToken, uuid: first } = await aliceGame();
    const { uuid: second } = (await createGame(aliceToken, { gameName: "Second" })).body.game;
    await request(app).patch(`/savedGames/${first}`).set(auth(aliceToken)).send({ pgn: "1. d4" });
    const bobToken = await makeUser("bob");
    await createGame(bobToken);

    const res = await request(app).get("/savedGames").set(auth(aliceToken));

    expect(res.status).toBe(200);
    expect(res.body.games.map((g) => g.uuid)).toEqual([first, second]);
    expect(res.body.games[0]).not.toHaveProperty("pgn");
    expect(res.body.games[0]).not.toHaveProperty("notes");
    expect(res.body.games[0].plyCount).toBe(1);
  });

  test("another student gets 404 on GET, PATCH and DELETE", async () => {
    const { uuid } = await aliceGame();
    const bobToken = await makeUser("bob");

    expect((await request(app).get(`/savedGames/${uuid}`).set(auth(bobToken))).status).toBe(404);
    expect(
      (await request(app).patch(`/savedGames/${uuid}`).set(auth(bobToken)).send({ pgn: "1. e4" })).status
    ).toBe(404);
    expect((await request(app).delete(`/savedGames/${uuid}`).set(auth(bobToken))).status).toBe(404);
    expect(await SavedGame.countDocuments({ uuid })).toBe(1);
  });

  test("the paired mentor can read the game but not change or delete it", async () => {
    const { uuid } = await aliceGame();
    const mentorToken = await makeUser("mentorMo", "mentor", "alice");

    const read = await request(app).get(`/savedGames/${uuid}`).set(auth(mentorToken));
    expect(read.status).toBe(200);
    expect(read.body.game.uuid).toBe(uuid);

    expect(
      (await request(app).patch(`/savedGames/${uuid}`).set(auth(mentorToken)).send({ pgn: "1. e4" })).status
    ).toBe(404);
    expect((await request(app).delete(`/savedGames/${uuid}`).set(auth(mentorToken))).status).toBe(404);
  });

  test("a mentor paired with someone else gets 404", async () => {
    const { uuid } = await aliceGame();
    const otherMentor = await makeUser("mentorZed", "mentor", "carol");
    expect((await request(app).get(`/savedGames/${uuid}`).set(auth(otherMentor))).status).toBe(404);
  });

  test("a one-sided mentorship link is not enough", async () => {
    // alice points at mentorMo, but this mentor's record points elsewhere.
    const { uuid } = await aliceGame();
    const mentorToken = await makeUser("mentorMo", "mentor", "somebodyElse");
    expect((await request(app).get(`/savedGames/${uuid}`).set(auth(mentorToken))).status).toBe(404);
  });

  test("access ends when the mentorship ends", async () => {
    const { uuid } = await aliceGame();
    const mentorToken = await makeUser("mentorMo", "mentor", "alice");
    expect((await request(app).get(`/savedGames/${uuid}`).set(auth(mentorToken))).status).toBe(200);

    await Users.updateOne({ username: "mentorMo" }, { $set: { mentorshipUsername: "" } });
    expect((await request(app).get(`/savedGames/${uuid}`).set(auth(mentorToken))).status).toBe(404);
  });

  test("an admin can read any game", async () => {
    const { uuid } = await aliceGame();
    const adminToken = await makeUser("admin1", "admin");
    expect((await request(app).get(`/savedGames/${uuid}`).set(auth(adminToken))).status).toBe(200);
  });

  test("a malformed id returns 404", async () => {
    const token = await makeUser("alice");
    expect((await request(app).get("/savedGames/not-a-uuid").set(auth(token))).status).toBe(404);
  });

  test("the owner can delete their game", async () => {
    const { aliceToken, uuid } = await aliceGame();
    const res = await request(app).delete(`/savedGames/${uuid}`).set(auth(aliceToken));
    expect(res.status).toBe(204);
    expect((await request(app).get(`/savedGames/${uuid}`).set(auth(aliceToken))).status).toBe(404);
  });
});

describe("resume", () => {
  test("a game saved from one session loads the same position in another", async () => {
    const token = await makeUser("alice");
    const { uuid } = (await createGame(token, { playerColor: "black", computerLevel: 15 })).body.game;
    await request(app).patch(`/savedGames/${uuid}`).set(auth(token)).send({ pgn: "1. e4 c5 2. Nf3" });

    // "Another device": a fresh login token for the same user.
    const laterToken = jwt.sign({ username: "alice", role: "student" }, config.get("indexKey"));
    const res = await request(app).get(`/savedGames/${uuid}`).set(auth(laterToken));

    expect(res.status).toBe(200);
    expect(res.body.game).toMatchObject({ playerColor: "black", computerLevel: 15, plyCount: 3 });
    const { Chess } = require("chess.js");
    const replayed = new Chess();
    replayed.loadPgn(res.body.game.pgn);
    expect(replayed.fen()).toBe(res.body.game.fen);
  });
});
