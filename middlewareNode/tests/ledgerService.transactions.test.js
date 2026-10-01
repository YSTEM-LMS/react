/**
 * Real-database tests for ledgerService.js's LEDGER_USE_TRANSACTIONS=true
 * path — the branch of applyLedgerEntry() that wraps the LedgerEntry
 * write and the UserBalance update in a genuine MongoDB multi-document
 * transaction, instead of the single-document fallback that's the
 * default (see applyLedgerEntry's file comment and Karthik's ledger
 * plan, Week 0: "run rs.status() ... report back before Week 1 opens").
 *
 * This file exists because that transactional branch had code but no
 * test coverage at all — the rest of ledgerService.test.js only ever
 * exercises the default, non-transactional fallback. Standalone
 * mongodb-memory-server instances (used everywhere else in this suite)
 * don't support transactions, so this file spins up a real single-node
 * *replica set* via MongoMemoryReplSet instead — transactions require a
 * replica set even with just one member, which is exactly the real-world
 * condition this code branch is written for.
 *
 * This does not answer the actual Week 0 question (is the real
 * deployment's MongoDB a replica set?) — that requires running
 * `rs.status()` against the real database, which nobody has reported
 * back on yet. What this answers is a different, also-real question:
 * if it is a replica set, does the transactional code path actually
 * work correctly? Before this file, that code had never once executed
 * in a test.
 */

const { MongoMemoryReplSet } = require("mongodb-memory-server");
const mongoose = require("mongoose");

jest.setTimeout(90000);

let replSet;
const ORIGINAL_FLAG = process.env.LEDGER_USE_TRANSACTIONS;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
    instanceOpts: [{ launchTimeout: 45000 }],
  });
  await replSet.waitUntilRunning();
  // getUri() returns a full connection string with its own query string
  // (e.g. "mongodb://127.0.0.1:PORT/?replicaSet=testset") — appending a
  // db name as a plain string suffix (the pattern used elsewhere in this
  // suite for MongoMemoryServer, which returns a bare "mongodb://host:port/")
  // would land inside the query string here and break it. getUri(dbName)
  // inserts it in the right place instead.
  await mongoose.connect(replSet.getUri("ystem"));

  process.env.LEDGER_USE_TRANSACTIONS = "true";
});

afterAll(async () => {
  await mongoose.disconnect();
  await replSet.stop();
  if (ORIGINAL_FLAG === undefined) {
    delete process.env.LEDGER_USE_TRANSACTIONS;
  } else {
    process.env.LEDGER_USE_TRANSACTIONS = ORIGINAL_FLAG;
  }
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
});

// Re-required fresh in each test file run — ledgerService reads
// process.env.LEDGER_USE_TRANSACTIONS at call time inside
// applyLedgerEntry(), not at module load, so no jest.resetModules()
// dance is needed to pick up the flag set in beforeAll above.
const ActionRule = require("../src/models/actionRule");
const LedgerEntry = require("../src/models/ledgerEntry");
const UserBalance = require("../src/models/userBalance");
const { processEvent, applyLedgerEntry } = require("../src/services/ledgerService");

const userId = new mongoose.Types.ObjectId();

describe("applyLedgerEntry — LEDGER_USE_TRANSACTIONS=true, real replica set", () => {
  it("writes exactly one LedgerEntry and updates UserBalance atomically for a new eventId", async () => {
    const result = await applyLedgerEntry({
      eventId: "tx-evt-1",
      userId,
      actionKey: "lesson.completed",
      amount: 10,
      occurredAt: new Date(),
    });

    expect(result).toEqual({ applied: true, duplicate: false });

    const entries = await LedgerEntry.find({ userId });
    expect(entries).toHaveLength(1);

    const balance = await UserBalance.findOne({ userId });
    expect(balance.balance).toBe(10);
    expect(balance.lifetimeEarned).toBe(10);
  });

  it("is a no-op on a duplicate eventId — the transaction's own insert fails, nothing commits twice", async () => {
    const args = {
      eventId: "tx-evt-dup",
      userId,
      actionKey: "lesson.completed",
      amount: 10,
      occurredAt: new Date(),
    };

    const first = await applyLedgerEntry(args);
    const second = await applyLedgerEntry(args);

    expect(first).toEqual({ applied: true, duplicate: false });
    expect(second).toEqual({ applied: false, duplicate: true });

    expect(await LedgerEntry.countDocuments({ userId, eventId: "tx-evt-dup" })).toBe(1);
    const balance = await UserBalance.findOne({ userId });
    expect(balance.lifetimeEarned).toBe(10); // not 20 — the duplicate never committed
  });

  it("survives concurrent duplicate inserts of the same eventId without double-paying", async () => {
    const args = {
      eventId: "tx-evt-race",
      userId,
      actionKey: "lesson.completed",
      amount: 10,
      occurredAt: new Date(),
    };

    const [a, b] = await Promise.all([applyLedgerEntry(args), applyLedgerEntry(args)]);
    const duplicateFlags = [a.duplicate, b.duplicate].sort();

    expect(duplicateFlags).toEqual([false, true]);
    expect(await LedgerEntry.countDocuments({ userId, eventId: "tx-evt-race" })).toBe(1);

    const balance = await UserBalance.findOne({ userId });
    expect(balance.lifetimeEarned).toBe(10);
  });

  it("never leaves a LedgerEntry committed without its matching UserBalance update (the actual point of using a transaction)", async () => {
    // The whole reason to prefer the transactional path over the
    // single-document fallback is that a crash between the two writes
    // can't happen — it's one atomic commit or nothing. Simulate the
    // UserBalance half failing (an invalid upsert) and confirm the
    // LedgerEntry side was rolled back too, not left stranded.
    const realUpdateOne = UserBalance.updateOne.bind(UserBalance);
    const spy = jest
      .spyOn(UserBalance, "updateOne")
      .mockImplementationOnce(() => {
        throw new Error("simulated UserBalance write failure");
      });

    await expect(
      applyLedgerEntry({
        eventId: "tx-evt-rollback",
        userId,
        actionKey: "lesson.completed",
        amount: 10,
        occurredAt: new Date(),
      })
    ).rejects.toThrow("simulated UserBalance write failure");

    // With the single-document fallback, this scenario would leave a
    // committed LedgerEntry with no matching balance update — "merely
    // stale," per that path's own design comment. The transactional path
    // must do better: the whole operation rolls back together.
    expect(await LedgerEntry.countDocuments({ eventId: "tx-evt-rollback" })).toBe(0);

    spy.mockRestore();
    void realUpdateOne; // kept for clarity on what was restored
  });

  it("accumulates balance and lifetimeEarned together across distinct events", async () => {
    await applyLedgerEntry({ eventId: "tx-evt-a", userId, actionKey: "lesson.completed", amount: 10, occurredAt: new Date() });
    await applyLedgerEntry({ eventId: "tx-evt-b", userId, actionKey: "puzzle.solved", amount: 5, occurredAt: new Date() });

    const balance = await UserBalance.findOne({ userId });
    expect(balance.balance).toBe(15);
    expect(balance.lifetimeEarned).toBe(15);
  });
});

describe("processEvent — rules engine, LEDGER_USE_TRANSACTIONS=true", () => {
  it("awards currency through the transactional path end to end", async () => {
    await ActionRule.create({ actionKey: "lesson.completed", currencyAmount: 25, active: true });

    const result = await processEvent({
      eventId: "tx-process-1",
      userId,
      actionKey: "lesson.completed",
      occurredAt: new Date(),
    });

    expect(result).toMatchObject({ outcome: "awarded", amount: 25 });

    const balance = await UserBalance.findOne({ userId });
    expect(balance.lifetimeEarned).toBe(25);
  });

  it("still enforces cooldown/daily-cap before ever starting a transaction", async () => {
    await ActionRule.create({ actionKey: "lesson.completed", currencyAmount: 10, active: true, cooldownSeconds: 3600 });
    const now = new Date();

    const first = await processEvent({ eventId: "tx-cd-1", userId, actionKey: "lesson.completed", occurredAt: now });
    expect(first.outcome).toBe("awarded");

    const second = await processEvent({
      eventId: "tx-cd-2",
      userId,
      actionKey: "lesson.completed",
      occurredAt: new Date(now.getTime() + 60 * 1000),
    });
    expect(second.outcome).toBe("cooldown");

    expect(await LedgerEntry.countDocuments({ userId })).toBe(1);
  });
});
