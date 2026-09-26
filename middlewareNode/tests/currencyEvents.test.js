/**
 * Real-database tests for services/currencyEvents.js — the producer
 * module every feature route goes through to record a currency-earning
 * action (Jimmy's ledger plan, Week 1-2: "no feature module imports
 * anything from the currency service directly").
 *
 * Uses mongodb-memory-server (see tests/ledgerService.test.js for why):
 * the property under test — a deterministic eventId makes a retried
 * emit a genuine no-op — is a real unique-index guarantee.
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
});

const ActionEvent = require("../src/models/actionEvent");
const { emit, emitLessonCompleted } = require("../src/services/currencyEvents");

const userId = new mongoose.Types.ObjectId();

describe("emit", () => {
  it("inserts a pending ActionEvent with the given shape", async () => {
    const result = await emit({
      eventId: "evt-1",
      actionKey: "lesson.completed",
      userId,
      metadata: { piece: "knight" },
    });

    expect(result).toEqual({ emitted: true, duplicate: false, eventId: "evt-1" });

    const stored = await ActionEvent.findOne({ eventId: "evt-1" });
    expect(stored.actionKey).toBe("lesson.completed");
    expect(stored.status).toBe("pending");
    expect(stored.metadata).toEqual({ piece: "knight" });
  });

  it("treats a duplicate eventId as a no-op, not an error", async () => {
    const args = { eventId: "evt-dup", actionKey: "lesson.completed", userId, metadata: {} };

    const first = await emit(args);
    const second = await emit(args);

    expect(first).toEqual({ emitted: true, duplicate: false, eventId: "evt-dup" });
    expect(second).toEqual({ emitted: false, duplicate: true, eventId: "evt-dup" });
    expect(await ActionEvent.countDocuments({ eventId: "evt-dup" })).toBe(1);
  });

  it("survives concurrent duplicate emits of the same eventId", async () => {
    const args = { eventId: "evt-race", actionKey: "lesson.completed", userId, metadata: {} };

    const [a, b] = await Promise.all([emit(args), emit(args)]);
    const duplicateFlags = [a.duplicate, b.duplicate].sort();

    expect(duplicateFlags).toEqual([false, true]);
    expect(await ActionEvent.countDocuments({ eventId: "evt-race" })).toBe(1);
  });
});

describe("emitLessonCompleted", () => {
  it("builds a deterministic eventId from userId, piece, and lessonNum", async () => {
    await emitLessonCompleted({ userId, piece: "The Fork", lessonNum: 2 });

    const stored = await ActionEvent.findOne({ actionKey: "lesson.completed" });
    expect(stored.eventId).toBe(`lesson:${userId}:The Fork:2`);
    expect(stored.metadata).toEqual({ piece: "The Fork", lessonNum: 2 });
  });

  it("never double-emits for the same (user, piece, lessonNum) — a client retry is a no-op", async () => {
    await emitLessonCompleted({ userId, piece: "The Fork", lessonNum: 2 });
    const second = await emitLessonCompleted({ userId, piece: "The Fork", lessonNum: 2 });

    expect(second.duplicate).toBe(true);
    expect(await ActionEvent.countDocuments({ actionKey: "lesson.completed" })).toBe(1);
  });

  it("emits separately for different lesson numbers on the same piece", async () => {
    await emitLessonCompleted({ userId, piece: "The Fork", lessonNum: 1 });
    await emitLessonCompleted({ userId, piece: "The Fork", lessonNum: 2 });

    expect(await ActionEvent.countDocuments({ actionKey: "lesson.completed" })).toBe(2);
  });

  it("emits separately for the same lesson number across different users", async () => {
    const otherUser = new mongoose.Types.ObjectId();
    await emitLessonCompleted({ userId, piece: "The Fork", lessonNum: 1 });
    await emitLessonCompleted({ userId: otherUser, piece: "The Fork", lessonNum: 1 });

    expect(await ActionEvent.countDocuments({ actionKey: "lesson.completed" })).toBe(2);
  });
});
