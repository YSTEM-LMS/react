/**
 * Real-database tests for services/ledgerService.js — the currency
 * rollout's rules engine and idempotent ledger writer.
 *
 * Uses mongodb-memory-server + real Mongoose models (no mocks), matching
 * the pattern in tests/badges.concurrency.test.js, because the property
 * this file exists to prove — "a duplicate eventId can never double-pay"
 * — is a real unique-index guarantee, not something a mock can stand in
 * for. A mocked model would happily "insert" the same eventId twice.
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
const UserBalance = require("../src/models/userBalance");
const {
  processEvent,
  applyLedgerEntry,
  getLifetimeEarnedOrZero,
} = require("../src/services/ledgerService");

const userId = new mongoose.Types.ObjectId();

async function makeRule(overrides = {}) {
  return ActionRule.create({
    actionKey: "lesson.completed",
    currencyAmount: 10,
    active: true,
    cooldownSeconds: 0,
    dailyCap: 0,
    ...overrides,
  });
}

describe("getLifetimeEarnedOrZero", () => {
  it("returns 0 for a user with no UserBalance document, not undefined", async () => {
    const result = await getLifetimeEarnedOrZero(new mongoose.Types.ObjectId());
    expect(result).toBe(0);
  });

  it("returns the real lifetimeEarned once a document exists", async () => {
    await UserBalance.create({ userId, balance: 5, lifetimeEarned: 5 });
    const result = await getLifetimeEarnedOrZero(userId);
    expect(result).toBe(5);
  });
});

describe("applyLedgerEntry idempotency", () => {
  it("writes exactly one LedgerEntry and one UserBalance update for a new eventId", async () => {
    const result = await applyLedgerEntry({
      eventId: "evt-1",
      userId,
      actionKey: "lesson.completed",
      amount: 10,
      occurredAt: new Date(),
    });

    expect(result).toEqual({ applied: true, duplicate: false });

    const entries = await LedgerEntry.find({ userId });
    expect(entries).toHaveLength(1);
    expect(entries[0].amount).toBe(10);

    const balance = await UserBalance.findOne({ userId });
    expect(balance.balance).toBe(10);
    expect(balance.lifetimeEarned).toBe(10);
  });

  it("is a no-op on a duplicate eventId — never double-pays", async () => {
    const args = {
      eventId: "evt-dup",
      userId,
      actionKey: "lesson.completed",
      amount: 10,
      occurredAt: new Date(),
    };

    const first = await applyLedgerEntry(args);
    const second = await applyLedgerEntry(args);

    expect(first).toEqual({ applied: true, duplicate: false });
    expect(second).toEqual({ applied: false, duplicate: true });

    const entries = await LedgerEntry.find({ userId, eventId: "evt-dup" });
    expect(entries).toHaveLength(1);

    const balance = await UserBalance.findOne({ userId });
    expect(balance.lifetimeEarned).toBe(10); // not 20
  });

  it("survives concurrent duplicate inserts of the same eventId (real retry, not just a unique-index assumption)", async () => {
    const args = {
      eventId: "evt-race",
      userId,
      actionKey: "lesson.completed",
      amount: 10,
      occurredAt: new Date(),
    };

    // Fire the same event twice "at once" — this is the scenario a
    // reconnect/retry actually produces, not just a sequential re-call.
    const [a, b] = await Promise.all([applyLedgerEntry(args), applyLedgerEntry(args)]);
    const outcomes = [a.duplicate, b.duplicate].sort();

    expect(outcomes).toEqual([false, true]); // exactly one applied, one duplicate

    const entries = await LedgerEntry.find({ userId, eventId: "evt-race" });
    expect(entries).toHaveLength(1);
  });

  it("accumulates balance and lifetimeEarned together across distinct events", async () => {
    await applyLedgerEntry({ eventId: "evt-a", userId, actionKey: "lesson.completed", amount: 10, occurredAt: new Date() });
    await applyLedgerEntry({ eventId: "evt-b", userId, actionKey: "puzzle.solved", amount: 5, occurredAt: new Date() });

    const balance = await UserBalance.findOne({ userId });
    expect(balance.balance).toBe(15);
    expect(balance.lifetimeEarned).toBe(15);
  });
});

describe("processEvent — rules engine", () => {
  it("returns no_rule when no ActionRule exists for the action", async () => {
    const result = await processEvent({
      eventId: "evt-1",
      userId,
      actionKey: "unknown.action",
      occurredAt: new Date(),
    });
    expect(result.outcome).toBe("no_rule");

    const entries = await LedgerEntry.find({});
    expect(entries).toHaveLength(0);
  });

  it("returns rule_inactive and writes nothing when the rule is disabled", async () => {
    await makeRule({ active: false });
    const result = await processEvent({
      eventId: "evt-1",
      userId,
      actionKey: "lesson.completed",
      occurredAt: new Date(),
    });
    expect(result.outcome).toBe("rule_inactive");
    expect(await LedgerEntry.countDocuments({})).toBe(0);
  });

  it("awards currency and returns the amount when a rule is active and clear", async () => {
    await makeRule({ currencyAmount: 25 });
    const result = await processEvent({
      eventId: "evt-1",
      userId,
      actionKey: "lesson.completed",
      occurredAt: new Date(),
    });
    expect(result).toMatchObject({ outcome: "awarded", amount: 25 });

    const balance = await UserBalance.findOne({ userId });
    expect(balance.lifetimeEarned).toBe(25);
  });

  it("returns duplicate (not awarded) on a re-processed eventId", async () => {
    await makeRule();
    const event = { eventId: "evt-1", userId, actionKey: "lesson.completed", occurredAt: new Date() };

    await processEvent(event);
    const second = await processEvent(event);

    expect(second.outcome).toBe("duplicate");
    expect(await LedgerEntry.countDocuments({})).toBe(1);
  });

  describe("cooldown enforcement", () => {
    it("rejects an award inside the cooldown window, before any ledger write", async () => {
      await makeRule({ cooldownSeconds: 3600 });
      const now = new Date();

      const first = await processEvent({ eventId: "evt-1", userId, actionKey: "lesson.completed", occurredAt: now });
      expect(first.outcome).toBe("awarded");

      const secondTime = new Date(now.getTime() + 60 * 1000); // 1 min later, inside a 1h cooldown
      const second = await processEvent({ eventId: "evt-2", userId, actionKey: "lesson.completed", occurredAt: secondTime });
      expect(second.outcome).toBe("cooldown");

      expect(await LedgerEntry.countDocuments({})).toBe(1);
    });

    it("allows an award once the cooldown window has passed", async () => {
      await makeRule({ cooldownSeconds: 60 });
      const now = new Date();

      await processEvent({ eventId: "evt-1", userId, actionKey: "lesson.completed", occurredAt: now });

      const laterTime = new Date(now.getTime() + 61 * 1000);
      const second = await processEvent({ eventId: "evt-2", userId, actionKey: "lesson.completed", occurredAt: laterTime });
      expect(second.outcome).toBe("awarded");

      expect(await LedgerEntry.countDocuments({})).toBe(2);
    });

    it("does not apply another user's history to a cooldown check", async () => {
      await makeRule({ cooldownSeconds: 3600 });
      const otherUser = new mongoose.Types.ObjectId();
      const now = new Date();

      await processEvent({ eventId: "evt-1", userId: otherUser, actionKey: "lesson.completed", occurredAt: now });
      const result = await processEvent({ eventId: "evt-2", userId, actionKey: "lesson.completed", occurredAt: now });

      expect(result.outcome).toBe("awarded");
    });
  });

  describe("daily-cap enforcement", () => {
    it("rejects an award once dailyCap payouts have already happened today (UTC)", async () => {
      await makeRule({ dailyCap: 2 });
      const day = new Date("2026-06-15T10:00:00.000Z");

      const r1 = await processEvent({ eventId: "evt-1", userId, actionKey: "lesson.completed", occurredAt: day });
      const r2 = await processEvent({
        eventId: "evt-2",
        userId,
        actionKey: "lesson.completed",
        occurredAt: new Date("2026-06-15T11:00:00.000Z"),
      });
      const r3 = await processEvent({
        eventId: "evt-3",
        userId,
        actionKey: "lesson.completed",
        occurredAt: new Date("2026-06-15T12:00:00.000Z"),
      });

      expect(r1.outcome).toBe("awarded");
      expect(r2.outcome).toBe("awarded");
      expect(r3.outcome).toBe("daily_cap");
      expect(await LedgerEntry.countDocuments({})).toBe(2);
    });

    it("resets the cap at UTC midnight", async () => {
      await makeRule({ dailyCap: 1 });

      const r1 = await processEvent({
        eventId: "evt-1",
        userId,
        actionKey: "lesson.completed",
        occurredAt: new Date("2026-06-15T23:59:00.000Z"),
      });
      const r2 = await processEvent({
        eventId: "evt-2",
        userId,
        actionKey: "lesson.completed",
        occurredAt: new Date("2026-06-16T00:01:00.000Z"),
      });

      expect(r1.outcome).toBe("awarded");
      expect(r2.outcome).toBe("awarded"); // new UTC day, cap reset
    });
  });
});
