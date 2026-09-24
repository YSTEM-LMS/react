/**
 * Real-database tests for scripts/backfillCurrencyLedger.js — the
 * historical backfill that synthesizes ActionEvents from existing
 * GameResults and replays them through the real currency consumer.
 *
 * Uses mongodb-memory-server (see tests/ledgerService.test.js for why):
 * idempotency-on-rerun and the actual replay-through-the-consumer step
 * are both real-database properties, not something a mock demonstrates.
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

const GameResults = require("../src/models/gameResults");
const ActionEvent = require("../src/models/actionEvent");
const ActionRule = require("../src/models/actionRule");
const LedgerEntry = require("../src/models/ledgerEntry");
const UserBalance = require("../src/models/userBalance");
const {
  backfillEventId,
  ensureGamePlayedRule,
  synthesizeGameEvents,
  replayPendingEvents,
} = require("../src/scripts/backfillCurrencyLedger");

async function makeUser(username) {
  const usersCollection = mongoose.connection.collection("users");
  const result = await usersCollection.insertOne({ username, role: "student" });
  return result.insertedId;
}

describe("ensureGamePlayedRule", () => {
  it("creates a default rule when none exists", async () => {
    const rule = await ensureGamePlayedRule({ dryRun: false });
    expect(rule.actionKey).toBe("game.played");
    expect(rule.currencyAmount).toBeGreaterThan(0);
    expect(await ActionRule.countDocuments({})).toBe(1);
  });

  it("leaves an existing rule untouched — never overrides a deliberately configured amount", async () => {
    await ActionRule.create({ actionKey: "game.played", currencyAmount: 42, active: true });
    const rule = await ensureGamePlayedRule({ dryRun: false });
    expect(rule.currencyAmount).toBe(42);
    expect(await ActionRule.countDocuments({})).toBe(1);
  });

  it("does not write anything in dry-run mode when no rule exists", async () => {
    await ensureGamePlayedRule({ dryRun: true });
    expect(await ActionRule.countDocuments({})).toBe(0);
  });
});

describe("synthesizeGameEvents", () => {
  it("creates one ActionEvent per player for each finished game", async () => {
    await GameResults.create({
      gameId: "game-1",
      players: ["alice", "bob"],
      result: "win",
      winnerUsername: "alice",
      loserUsername: "bob",
      reason: "checkmate",
      playedAt: new Date("2026-01-01"),
    });
    await makeUser("alice");
    await makeUser("bob");

    const usersCollection = mongoose.connection.collection("users");
    const result = await synthesizeGameEvents({ dryRun: false, usersCollection });

    expect(result.gamesScanned).toBe(1);
    expect(result.eventsInserted).toBe(2);
    expect(await ActionEvent.countDocuments({ actionKey: "game.played" })).toBe(2);

    const aliceEvent = await ActionEvent.findOne({ eventId: backfillEventId("game-1", "alice") });
    expect(aliceEvent).not.toBeNull();
    expect(aliceEvent.status).toBe("pending");
    expect(aliceEvent.occurredAt).toEqual(new Date("2026-01-01"));
  });

  it("is idempotent — re-running produces no new events for already-backfilled games", async () => {
    await GameResults.create({
      gameId: "game-1",
      players: ["alice", "bob"],
      result: "draw",
      reason: "draw",
      playedAt: new Date("2026-01-01"),
    });
    await makeUser("alice");
    await makeUser("bob");
    const usersCollection = mongoose.connection.collection("users");

    await synthesizeGameEvents({ dryRun: false, usersCollection });
    const second = await synthesizeGameEvents({ dryRun: false, usersCollection });

    expect(second.eventsInserted).toBe(0);
    expect(second.eventsSkippedDuplicate).toBe(2);
    expect(await ActionEvent.countDocuments({})).toBe(2);
  });

  it("skips a player whose username no longer resolves to a real user, without crashing", async () => {
    await GameResults.create({
      gameId: "game-1",
      players: ["alice", "ghost-user"],
      result: "win",
      winnerUsername: "alice",
      loserUsername: "ghost-user",
      reason: "resign",
      playedAt: new Date("2026-01-01"),
    });
    await makeUser("alice");
    const usersCollection = mongoose.connection.collection("users");

    const result = await synthesizeGameEvents({ dryRun: false, usersCollection });

    expect(result.eventsInserted).toBe(1);
    expect(result.eventsSkippedUnresolvedUser).toBe(1);
    expect(result.unresolvedUsernames).toEqual(["ghost-user"]);
  });

  it("does not write anything in dry-run mode, but still reports accurate counts", async () => {
    await GameResults.create({
      gameId: "game-1",
      players: ["alice", "bob"],
      result: "win",
      winnerUsername: "alice",
      loserUsername: "bob",
      reason: "checkmate",
      playedAt: new Date("2026-01-01"),
    });
    await makeUser("alice");
    await makeUser("bob");
    const usersCollection = mongoose.connection.collection("users");

    const result = await synthesizeGameEvents({ dryRun: true, usersCollection });

    expect(result.eventsInserted).toBe(2);
    expect(await ActionEvent.countDocuments({})).toBe(0); // nothing actually written
  });
});

describe("replayPendingEvents", () => {
  it("processes every pending event through the real consumer and pays out lifetimeEarned", async () => {
    await ActionRule.create({ actionKey: "game.played", currencyAmount: 10, active: true });
    const aliceId = await makeUser("alice");
    const bobId = await makeUser("bob");

    const usersCollection = mongoose.connection.collection("users");
    await GameResults.create({
      gameId: "game-1",
      players: ["alice", "bob"],
      result: "win",
      winnerUsername: "alice",
      loserUsername: "bob",
      reason: "checkmate",
      playedAt: new Date("2026-01-01"),
    });
    await synthesizeGameEvents({ dryRun: false, usersCollection });

    const replay = await replayPendingEvents({ dryRun: false, batchSize: 50 });

    expect(replay.totalProcessed).toBe(2);
    expect(replay.outcomeCounts.awarded).toBe(2);
    expect(await ActionEvent.countDocuments({ status: "pending" })).toBe(0);

    const aliceBalance = await UserBalance.findOne({ userId: aliceId });
    const bobBalance = await UserBalance.findOne({ userId: bobId });
    expect(aliceBalance.lifetimeEarned).toBe(10);
    expect(bobBalance.lifetimeEarned).toBe(10);
  });

  it("drains in multiple batches when there are more pending events than batchSize", async () => {
    await ActionRule.create({ actionKey: "game.played", currencyAmount: 1, active: true });
    const usersCollection = mongoose.connection.collection("users");
    await makeUser("alice");
    await makeUser("bob");

    for (let i = 0; i < 5; i++) {
      await GameResults.create({
        gameId: `game-${i}`,
        players: ["alice", "bob"],
        result: "draw",
        reason: "draw",
        playedAt: new Date(`2026-01-0${i + 1}`),
      });
    }
    await synthesizeGameEvents({ dryRun: false, usersCollection });

    const replay = await replayPendingEvents({ dryRun: false, batchSize: 3 });

    expect(replay.totalProcessed).toBe(10); // 5 games * 2 players
    expect(await ActionEvent.countDocuments({ status: "pending" })).toBe(0);
  });

  it("does not process anything in dry-run mode", async () => {
    await ActionRule.create({ actionKey: "game.played", currencyAmount: 10, active: true });
    const usersCollection = mongoose.connection.collection("users");
    await makeUser("alice");
    await makeUser("bob");
    await GameResults.create({
      gameId: "game-1",
      players: ["alice", "bob"],
      result: "win",
      winnerUsername: "alice",
      loserUsername: "bob",
      reason: "checkmate",
      playedAt: new Date("2026-01-01"),
    });
    await synthesizeGameEvents({ dryRun: false, usersCollection });

    const replay = await replayPendingEvents({ dryRun: true });

    expect(replay.totalProcessed).toBe(0);
    expect(await ActionEvent.countDocuments({ status: "pending" })).toBe(2); // untouched
    expect(await LedgerEntry.countDocuments({})).toBe(0);
  });
});

describe("end-to-end backfill idempotency (the property the plan cares most about)", () => {
  it("running synthesize + replay twice never double-pays a student", async () => {
    await makeUser("alice");
    await makeUser("bob");
    const usersCollection = mongoose.connection.collection("users");

    await GameResults.create({
      gameId: "game-1",
      players: ["alice", "bob"],
      result: "win",
      winnerUsername: "alice",
      loserUsername: "bob",
      reason: "checkmate",
      playedAt: new Date("2026-01-01"),
    });

    await ensureGamePlayedRule({ dryRun: false });
    await synthesizeGameEvents({ dryRun: false, usersCollection });
    await replayPendingEvents({ dryRun: false });

    // Re-run the whole pipeline exactly as a second invocation of the
    // script would.
    await ensureGamePlayedRule({ dryRun: false });
    await synthesizeGameEvents({ dryRun: false, usersCollection });
    await replayPendingEvents({ dryRun: false });

    const aliceId = (await usersCollection.findOne({ username: "alice" }))._id;
    const balance = await UserBalance.findOne({ userId: aliceId });
    const rule = await ActionRule.findOne({ actionKey: "game.played" });

    expect(balance.lifetimeEarned).toBe(rule.currencyAmount); // not double
    expect(await LedgerEntry.countDocuments({ userId: aliceId })).toBe(1);
  });
});
