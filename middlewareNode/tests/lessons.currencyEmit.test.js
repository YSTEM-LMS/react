/**
 * Real-database integration test for routes/lessons.js's
 * /updateLessonCompletion — specifically the currency-event emit added
 * for Jimmy's ledger plan (Week 2: "emit lesson.completed ... one line,
 * no currency logic inline").
 *
 * Not a full route test suite (this route had none before this change,
 * a pre-existing gap this file doesn't attempt to close) — scoped to the
 * one property this session's change needs proven: the emit fires only
 * on genuine forward progress, never on a no-op re-request and never for
 * an unauthenticated guest.
 *
 * Uses mongodb-memory-server (matching tests/ledgerService.test.js and
 * friends) rather than mocking getDb()/passport, since this route talks
 * to the database directly via a raw driver handle (getDb()), not a
 * Mongoose model — a mock here would mean re-implementing Mongo query
 * semantics by hand instead of exercising the real thing.
 */

const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");

jest.setTimeout(60000);

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
  jest.restoreAllMocks();
});

// Bypasses the real JWT verification (irrelevant to this test) but keeps
// req.user a real, DB-backed document the same way passport's own
// verify callback does (see config/passport.js) — req.user._id has to be
// a real ObjectId for emitLessonCompleted to build a usable eventId.
jest.mock("passport", () => ({
  authenticate: (_strategy, _opts, callback) => (req, res, next) => {
    if (req.headers["x-test-guest"] === "true") {
      callback(null, false, null);
    } else {
      callback(null, req.__testUser, null);
    }
  },
}));

const express = require("express");
const request = require("supertest");
const lessonsRouter = require("../src/routes/lessons");
const ActionEvent = require("../src/models/actionEvent");

const app = express();
app.use(express.json());
// Injects req.__testUser before passport's mocked authenticate reads it —
// simulates "this is the already-authenticated user" without a real JWT.
app.use((req, _res, next) => {
  if (req.headers["x-test-user-id"]) {
    req.__testUser = { _id: req.headers["x-test-user-id"], username: req.headers["x-test-username"] };
  }
  next();
});
app.use("/lessons", lessonsRouter);

async function seedUser({ username, piece, lessonNumber }) {
  const usersCollection = mongoose.connection.collection("users");
  const result = await usersCollection.insertOne({
    username,
    lessonsCompleted: [{ piece, lessonNumber }],
  });
  return result.insertedId;
}

describe("GET /lessons/updateLessonCompletion — currency emit", () => {
  it("emits lesson.completed when the write is genuine forward progress", async () => {
    const userId = await seedUser({ username: "alice", piece: "The Fork", lessonNumber: 0 });

    const res = await request(app)
      .get("/lessons/updateLessonCompletion")
      .query({ piece: "The Fork", lessonNum: "1" })
      .set("x-test-user-id", userId.toString())
      .set("x-test-username", "alice");

    expect(res.status).toBe(200);

    // The emit is fire-and-forget (a .catch(), not awaited by the route)
    // — give it a tick to land before asserting.
    await new Promise((r) => setImmediate(r));

    const stored = await ActionEvent.findOne({ actionKey: "lesson.completed" });
    expect(stored).not.toBeNull();
    expect(stored.userId.toString()).toBe(userId.toString());
    expect(stored.metadata).toEqual({ piece: "The Fork", lessonNum: 1 });
  });

  it("does NOT emit when the request doesn't advance progress (304 branch)", async () => {
    // lessonNumber already at 5; requesting lessonNum=2 (index of an
    // earlier lesson) can't win the $lt comparison, so modifiedCount is 0.
    const userId = await seedUser({ username: "bob", piece: "The Fork", lessonNumber: 5 });

    const res = await request(app)
      .get("/lessons/updateLessonCompletion")
      .query({ piece: "The Fork", lessonNum: "2" })
      .set("x-test-user-id", userId.toString())
      .set("x-test-username", "bob");

    expect(res.status).toBe(304);

    await new Promise((r) => setImmediate(r));

    expect(await ActionEvent.countDocuments({ actionKey: "lesson.completed" })).toBe(0);
  });

  it("does NOT emit for a repeated request that already succeeded once (idempotent, not double-counted)", async () => {
    const userId = await seedUser({ username: "carol", piece: "The Fork", lessonNumber: 0 });

    const query = { piece: "The Fork", lessonNum: "1" };
    const headers = { "x-test-user-id": userId.toString(), "x-test-username": "carol" };

    const first = await request(app).get("/lessons/updateLessonCompletion").query(query).set(headers);
    expect(first.status).toBe(200);
    await new Promise((r) => setImmediate(r));

    // Re-sending the exact same request: the DB write itself is now a
    // no-op (lessonNumber is already 1, not < 1), so this hits the 304
    // branch and must not add a second event even if it somehow did.
    const second = await request(app).get("/lessons/updateLessonCompletion").query(query).set(headers);
    expect(second.status).toBe(304);
    await new Promise((r) => setImmediate(r));

    expect(await ActionEvent.countDocuments({ actionKey: "lesson.completed" })).toBe(1);
  });

  it("never emits for a guest (unauthenticated) request", async () => {
    // "The Fork" doesn't match the guest seed list's exact full name
    // ("The Fork Use the fork, Luke"), so this correctly 404s — the point
    // under test isn't the guest branch's own behavior (untouched by this
    // change), only that no ActionEvent is ever created for it either way.
    const res = await request(app)
      .get("/lessons/updateLessonCompletion")
      .query({ piece: "The Fork", lessonNum: "1" })
      .set("x-test-guest", "true")
      .set("x-forwarded-for", "203.0.113.5");

    expect(res.status).toBe(404);
    await new Promise((r) => setImmediate(r));

    expect(await ActionEvent.countDocuments({})).toBe(0);
  });
});
