/**
 * Real-database tests for scheduler/currencyAnomalyScheduler.js — the
 * flag-only anomaly monitor from Karthik's ledger plan Week 3 hardening.
 *
 * Uses mongodb-memory-server (see tests/ledgerService.test.js for why):
 * the $group aggregation over LedgerEntry is exactly the kind of query a
 * mock can't meaningfully stand in for.
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

const LedgerEntry = require("../src/models/ledgerEntry");
const { detectAnomalies, computeEarnedTotals, median } = require("../src/scheduler/currencyAnomalyScheduler");

function id() {
  return new mongoose.Types.ObjectId();
}

async function makeEntry(userId, amount, occurredAt) {
  return LedgerEntry.create({
    eventId: `evt-${Math.random().toString(36).slice(2)}`,
    userId,
    actionKey: "lesson.completed",
    amount,
    occurredAt,
  });
}

describe("median", () => {
  it("returns the middle value for an odd-length sorted array", () => {
    expect(median([1, 3, 5])).toBe(3);
  });

  it("averages the two middle values for an even-length sorted array", () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
});

describe("computeEarnedTotals", () => {
  it("sums only positive entries within the window, per user", async () => {
    const alice = id();
    const bob = id();
    const now = new Date("2026-06-15T12:00:00Z");

    await makeEntry(alice, 10, new Date("2026-06-15T10:00:00Z"));
    await makeEntry(alice, 5, new Date("2026-06-15T11:00:00Z"));
    await makeEntry(bob, 20, new Date("2026-06-15T09:00:00Z"));
    // Outside the 24h window — should not count.
    await makeEntry(bob, 999, new Date("2026-06-10T00:00:00Z"));

    const totals = await computeEarnedTotals(new Date(now.getTime() - 24 * 60 * 60 * 1000));

    expect(totals.get(String(alice))).toBe(15);
    expect(totals.get(String(bob))).toBe(20);
  });
});

describe("detectAnomalies", () => {
  it("skips detection when there are too few earners in the window", async () => {
    for (let i = 0; i < 3; i++) {
      await makeEntry(id(), 10, new Date());
    }
    const result = await detectAnomalies({ persist: false });
    expect(result.skipped).toBe(true);
    expect(result.flagged).toHaveLength(0);
  });

  it("flags no one when everyone earns roughly the same amount", async () => {
    for (let i = 0; i < 10; i++) {
      await makeEntry(id(), 10, new Date());
    }
    const result = await detectAnomalies({ persist: false });
    expect(result.flagged).toHaveLength(0);
  });

  it("flags a user whose 24h total is a clear outlier from the population", async () => {
    // Nine normal earners around 10, one wildly above everyone else.
    const normalUsers = Array.from({ length: 9 }, () => id());
    for (const u of normalUsers) {
      await makeEntry(u, 10, new Date());
    }
    const outlier = id();
    await makeEntry(outlier, 5000, new Date());

    const result = await detectAnomalies({ persist: false });

    expect(result.flagged).toHaveLength(1);
    expect(result.flagged[0].userId).toBe(String(outlier));
    expect(result.flagged[0].totalEarned24h).toBe(5000);
  });

  it("does not flag ordinary variance within a normal-looking population", async () => {
    const amounts = [8, 9, 10, 10, 11, 12, 9, 10, 11, 10];
    for (const amount of amounts) {
      await makeEntry(id(), amount, new Date());
    }
    const result = await detectAnomalies({ persist: false });
    expect(result.flagged).toHaveLength(0);
  });

  it("handles a zero-deviation population (everyone identical) without dividing by zero", async () => {
    for (let i = 0; i < 6; i++) {
      await makeEntry(id(), 10, new Date());
    }
    const result = await detectAnomalies({ persist: false });
    expect(result.skipped).toBe(true);
    expect(result.reason).toMatch(/zero deviation/);
  });

  it("persists flags to currencyAnomalyFlags when persist is true (the default)", async () => {
    const normalUsers = Array.from({ length: 9 }, () => id());
    for (const u of normalUsers) {
      await makeEntry(u, 10, new Date());
    }
    const outlier = id();
    await makeEntry(outlier, 5000, new Date());

    await detectAnomalies();

    const stored = await mongoose.connection.db.collection("currencyAnomalyFlags").find({}).toArray();
    expect(stored).toHaveLength(1);
    expect(stored[0].userId.toString()).toBe(String(outlier));
    expect(stored[0].totalEarned24h).toBe(5000);
  });

  it("never mutates a LedgerEntry or UserBalance — flag-only, per the plan", async () => {
    const normalUsers = Array.from({ length: 9 }, () => id());
    for (const u of normalUsers) {
      await makeEntry(u, 10, new Date());
    }
    const outlier = id();
    await makeEntry(outlier, 5000, new Date());

    const beforeCount = await LedgerEntry.countDocuments({});
    await detectAnomalies();
    const afterCount = await LedgerEntry.countDocuments({});

    expect(afterCount).toBe(beforeCount);
    const UserBalance = require("../src/models/userBalance");
    expect(await UserBalance.countDocuments({})).toBe(0); // detectAnomalies never touches balances
  });
});
