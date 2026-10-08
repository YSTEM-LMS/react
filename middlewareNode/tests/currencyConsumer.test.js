/**
 * Real-database tests for services/currencyConsumer.js — the polling
 * worker that claims ActionEvent documents and runs them through the
 * ledger service (Rev. 2, "Drop Redis from this window": a plain Mongo
 * collection + polling worker in place of Redis Streams + consumer
 * group).
 *
 * Uses mongodb-memory-server (see tests/ledgerService.test.js for why —
 * this file is specifically about the atomicity of claimNextEvent()
 * under concurrency, which a mock can't demonstrate).
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

const ActionRule = require("../src/models/actionRule");
const ActionEvent = require("../src/models/actionEvent");
const LedgerEntry = require("../src/models/ledgerEntry");
const {
  claimNextEvent,
  drainBatch,
  requeueStuckClaims,
} = require("../src/services/currencyConsumer");

const userId = new mongoose.Types.ObjectId();

async function makeEvent(overrides = {}) {
  return ActionEvent.create({
    eventId: `evt-${Math.random().toString(36).slice(2)}`,
    actionKey: "lesson.completed",
    userId,
    occurredAt: new Date(),
    ...overrides,
  });
}

describe("claimNextEvent", () => {
  it("returns null when nothing is pending", async () => {
    expect(await claimNextEvent()).toBeNull();
  });

  it("claims the oldest pending event and marks it 'claimed'", async () => {
    const older = await makeEvent({ occurredAt: new Date("2026-01-01") });
    await makeEvent({ occurredAt: new Date("2026-06-01") });

    const claimed = await claimNextEvent();
    expect(claimed.eventId).toBe(older.eventId);
    expect(claimed.status).toBe("claimed");
  });

  it("never lets two concurrent claims take the same event (atomic claim)", async () => {
    await makeEvent();

    const [a, b] = await Promise.all([claimNextEvent(), claimNextEvent()]);
    const claimedResults = [a, b].filter(Boolean);

    // Exactly one of the two racing claims should have gotten the event;
    // the other must see nothing pending left.
    expect(claimedResults).toHaveLength(1);
  });
});

describe("drainBatch", () => {
  it("processes all pending events up to batchSize, awarding per the active rule", async () => {
    await ActionRule.create({ actionKey: "lesson.completed", currencyAmount: 10, active: true });
    await makeEvent();
    await makeEvent();
    await makeEvent();

    const results = await drainBatch(10);

    expect(results).toHaveLength(3);
    expect(results.every((r) => r.outcome === "awarded")).toBe(true);
    expect(await LedgerEntry.countDocuments({})).toBe(3);
    expect(await ActionEvent.countDocuments({ status: "processed" })).toBe(3);
  });

  it("respects batchSize and leaves the rest pending for the next call", async () => {
    await ActionRule.create({ actionKey: "lesson.completed", currencyAmount: 5, active: true });
    await makeEvent();
    await makeEvent();
    await makeEvent();

    const firstBatch = await drainBatch(2);
    expect(firstBatch).toHaveLength(2);
    expect(await ActionEvent.countDocuments({ status: "pending" })).toBe(1);

    const secondBatch = await drainBatch(2);
    expect(secondBatch).toHaveLength(1);
    expect(await ActionEvent.countDocuments({ status: "pending" })).toBe(0);
  });

  it("marks an event 'failed' with a reason, not silently dropped, when processing throws", async () => {
    // Force a genuine runtime failure rather than mocking processEvent:
    // insert an ActionRule via the raw driver to bypass Mongoose's own
    // schema validation/casting, giving it a non-numeric currencyAmount.
    // processEvent reaches applyLedgerEntry with that value, and
    // LedgerEntry's own schema (amount: Number) genuinely rejects the
    // write with a real CastError — the same class of failure a bad
    // downstream write would produce in production.
    await ActionRule.collection.insertOne({
      actionKey: "lesson.completed",
      currencyAmount: "not-a-number",
      active: true,
      cooldownSeconds: 0,
      dailyCap: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const event = await makeEvent({ actionKey: "lesson.completed" });

    const claimed = await claimNextEvent();
    expect(claimed._id.toString()).toBe(event._id.toString());

    const { processClaimedEvent } = require("../src/services/currencyConsumer");
    const result = await processClaimedEvent(claimed);

    expect(result.outcome).toBe("error");
    const stored = await ActionEvent.findById(claimed._id);
    expect(stored.status).toBe("failed");
    expect(stored.failureReason).toBeTruthy();
  });
});

describe("requeueStuckClaims", () => {
  it("requeues a claimed event older than the stale threshold back to pending", async () => {
    const event = await makeEvent();
    // Mongoose's `timestamps: true` re-stamps updatedAt to "now" on every
    // .updateOne() call, so backdating it has to go through the raw
    // driver — a Mongoose-level update here would silently make this
    // event look freshly claimed and the test would falsely pass either way.
    await ActionEvent.collection.updateOne(
      { _id: event._id },
      { $set: { status: "claimed", updatedAt: new Date(Date.now() - 10 * 60 * 1000) } }
    );

    const requeued = await requeueStuckClaims(5 * 60 * 1000);
    expect(requeued).toBe(1);

    const stored = await ActionEvent.findById(event._id);
    expect(stored.status).toBe("pending");
  });

  it("does not touch a recently claimed event still within the stale threshold", async () => {
    const event = await makeEvent();
    await ActionEvent.updateOne({ _id: event._id }, { $set: { status: "claimed" } });

    const requeued = await requeueStuckClaims(5 * 60 * 1000);
    expect(requeued).toBe(0);

    const stored = await ActionEvent.findById(event._id);
    expect(stored.status).toBe("claimed");
  });

  it("never touches an already-processed event", async () => {
    const event = await makeEvent();
    // Raw driver again — see the note in the first test in this
    // describe() block on why a Mongoose .updateOne() won't backdate
    // updatedAt.
    await ActionEvent.collection.updateOne(
      { _id: event._id },
      { $set: { status: "processed", updatedAt: new Date(Date.now() - 10 * 60 * 1000) } }
    );

    await requeueStuckClaims(5 * 60 * 1000);

    const stored = await ActionEvent.findById(event._id);
    expect(stored.status).toBe("processed");
  });
});
