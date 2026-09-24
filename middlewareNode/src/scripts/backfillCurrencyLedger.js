/**
 * One-time (but safely re-runnable) backfill: synthesize historical
 * ActionEvent records from existing GameResults documents, then replay
 * them through the real currency consumer so every existing student's
 * UserBalance.lifetimeEarned reflects real history before the leaderboard
 * swap (Jimmy's Week 3) goes live. See Karthik's ledger plan, "Week 2-3 —
 * historical backfill."
 *
 * SCOPE: games only. The plan's original wording ("synthesize from
 * timeTrackings, users.lessonsCompleted, gameResults") assumed all three
 * sources cleanly map to discrete, timestamped completion events. They do
 * not:
 *   - gameResults has a real playedAt per finished game — clean.
 *   - users.lessonsCompleted is a current-state snapshot ({ piece,
 *     lessonNumber }) with NO per-completion timestamp — there is no
 *     historical date to backfill from, only "how many are done right
 *     now."
 *   - timeTrackings' eventType: "puzzle" records time SPENT on puzzles,
 *     not puzzles SOLVED — backfilling currency from it would pay for
 *     time-on-page, not achievement, which is a different thing than
 *     what a live puzzle.solved event will mean once Jimmy wires one.
 * Backfilling lessons/puzzles from these sources would mean guessing at
 * history rather than reconstructing it. Deliberately deferred — every
 * existing student's lesson/puzzle currency starts at 0 and accrues from
 * here forward, same as a student who joined the day this ships. Only
 * game-playing history is backfilled. Revisit if a real completion-dated
 * source for lessons/puzzles becomes available (e.g. once Srujana's
 * completedDates write path — a separate, independent lane — is live and
 * has accumulated some real history of its own).
 *
 * Idempotency: each synthetic ActionEvent gets a deterministic eventId
 * (`backfill:game:<gameId>:<username>`) — running this script twice
 * produces the same eventIds, which the unique index on
 * ActionEvent.eventId (and again on LedgerEntry.eventId, the real
 * idempotency backstop) rejects as duplicates. Re-running after new games
 * have been played only backfills the new ones.
 *
 * Requires an active ActionRule for "game.played" to exist — see
 * ensureGamePlayedRule() below, which creates a conservative default if
 * one is missing rather than silently processing zero events.
 *
 * Usage:
 *   node src/scripts/backfillCurrencyLedger.js
 *   node src/scripts/backfillCurrencyLedger.js --dry-run
 */

require("dotenv").config();
const mongoose = require("mongoose");
// Deferred to inside run() rather than required at module scope: this
// file also exports helpers for tests/backfillCurrencyLedger.test.js,
// which connects to its own in-memory MongoDB instance directly and
// never wants this package's config/*.json lookup (and the "no config
// file matches NODE_ENV=test" warning that comes with it under Jest).

const GameResults = require("../models/gameResults");
const ActionEvent = require("../models/actionEvent");
const ActionRule = require("../models/actionRule");
const { drainBatch } = require("../services/currencyConsumer");

const GAME_PLAYED_ACTION_KEY = "game.played";
const DEFAULT_GAME_PLAYED_AMOUNT = 5;

function backfillEventId(gameId, username) {
  return `backfill:game:${gameId}:${username}`;
}

/**
 * Looks up the user document for a username and returns its _id, or null
 * if the username doesn't resolve to a real user (a stale/renamed
 * account) — skipped rather than crashing the whole backfill.
 */
async function resolveUserId(usersCollection, username) {
  const user = await usersCollection.findOne({ username }, { projection: { _id: 1 } });
  return user ? user._id : null;
}

/**
 * Ensures an ActionRule exists for game.played so backfilled events have
 * something to pay out against. If one already exists (created in Week 0
 * as part of the real contract), this leaves it untouched — the backfill
 * should never override a deliberately configured rule. Only creates a
 * conservative default when none exists at all, so `no_rule` doesn't
 * silently swallow every backfilled event.
 */
async function ensureGamePlayedRule({ dryRun }) {
  const existing = await ActionRule.findOne({ actionKey: GAME_PLAYED_ACTION_KEY });
  if (existing) {
    console.log(`ActionRule for "${GAME_PLAYED_ACTION_KEY}" already exists (amount=${existing.currencyAmount}, active=${existing.active}) — leaving as configured.`);
    return existing;
  }

  console.log(`No ActionRule for "${GAME_PLAYED_ACTION_KEY}" found.`);
  if (dryRun) {
    console.log(`[dry-run] Would create one with currencyAmount=${DEFAULT_GAME_PLAYED_AMOUNT}.`);
    return { actionKey: GAME_PLAYED_ACTION_KEY, currencyAmount: DEFAULT_GAME_PLAYED_AMOUNT, active: true };
  }

  const created = await ActionRule.create({
    actionKey: GAME_PLAYED_ACTION_KEY,
    currencyAmount: DEFAULT_GAME_PLAYED_AMOUNT,
    active: true,
    cooldownSeconds: 0,
    dailyCap: 0,
    notes: "Created automatically by backfillCurrencyLedger.js — review the amount before Final Merge.",
  });
  console.log(`Created a default ActionRule for "${GAME_PLAYED_ACTION_KEY}" with currencyAmount=${DEFAULT_GAME_PLAYED_AMOUNT}. Review this before relying on it in production.`);
  return created;
}

/**
 * Synthesizes one ActionEvent per (game, player) pair for every
 * GameResults document not already backfilled, and inserts them as
 * "pending" — exactly as if a live game.played producer had just emitted
 * them. Returns counts, not the documents themselves, since a real
 * backfill can cover years of games.
 */
async function synthesizeGameEvents({ dryRun, usersCollection }) {
  const cursor = GameResults.find({}).lean().cursor();

  let gamesScanned = 0;
  let eventsInserted = 0;
  let eventsSkippedDuplicate = 0;
  let eventsSkippedUnresolvedUser = 0;
  const unresolvedUsernames = new Set();

  for await (const game of cursor) {
    gamesScanned++;

    for (const username of game.players) {
      const eventId = backfillEventId(game.gameId, username);

      const userId = await resolveUserId(usersCollection, username);
      if (!userId) {
        eventsSkippedUnresolvedUser++;
        unresolvedUsernames.add(username);
        continue;
      }

      if (dryRun) {
        const alreadyExists = await ActionEvent.exists({ eventId });
        if (alreadyExists) {
          eventsSkippedDuplicate++;
        } else {
          eventsInserted++;
        }
        continue;
      }

      try {
        await ActionEvent.create({
          eventId,
          actionKey: GAME_PLAYED_ACTION_KEY,
          userId,
          metadata: {
            gameId: game.gameId,
            result: game.result,
            reason: game.reason,
            backfilled: true,
          },
          status: "pending",
          occurredAt: game.playedAt,
        });
        eventsInserted++;
      } catch (err) {
        if (err && err.code === 11000) {
          eventsSkippedDuplicate++;
        } else {
          throw err;
        }
      }
    }
  }

  return {
    gamesScanned,
    eventsInserted,
    eventsSkippedDuplicate,
    eventsSkippedUnresolvedUser,
    unresolvedUsernames: Array.from(unresolvedUsernames),
  };
}

/**
 * Drains every newly inserted "pending" backfill event through the real
 * consumer (services/currencyConsumer.drainBatch), in batches, until
 * none remain. This is the "replay through the same consumer the live
 * path uses" step — it's the best available test of that consumer, since
 * it's about to process a real, large, historically-shaped batch of
 * events for the first time.
 */
async function replayPendingEvents({ dryRun, batchSize = 100 }) {
  if (dryRun) {
    const pendingCount = await ActionEvent.countDocuments({ status: "pending" });
    console.log(`[dry-run] Would replay ${pendingCount} pending event(s) through the consumer.`);
    return { totalProcessed: 0, outcomeCounts: {} };
  }

  let totalProcessed = 0;
  const outcomeCounts = {};

  for (;;) {
    const results = await drainBatch(batchSize);
    if (results.length === 0) break;

    totalProcessed += results.length;
    for (const r of results) {
      outcomeCounts[r.outcome] = (outcomeCounts[r.outcome] || 0) + 1;
    }
  }

  return { totalProcessed, outcomeCounts };
}

async function run() {
  const dryRun = process.argv.includes("--dry-run");

  const config = require("config");
  await mongoose.connect(config.get("mongoURI"));
  console.log(`Connected to MongoDB${dryRun ? " (dry run — no writes)" : ""}`);

  const usersCollection = mongoose.connection.collection("users");

  await ensureGamePlayedRule({ dryRun });

  console.log("\nScanning GameResults for events to synthesize...");
  const synthesis = await synthesizeGameEvents({ dryRun, usersCollection });

  console.log(`Games scanned:                 ${synthesis.gamesScanned}`);
  console.log(`ActionEvents inserted:         ${synthesis.eventsInserted}`);
  console.log(`Skipped (already backfilled):  ${synthesis.eventsSkippedDuplicate}`);
  console.log(`Skipped (username not found):  ${synthesis.eventsSkippedUnresolvedUser}`);
  if (synthesis.unresolvedUsernames.length > 0) {
    console.log(`  Unresolved usernames: ${synthesis.unresolvedUsernames.join(", ")}`);
  }

  console.log("\nReplaying pending events through the real consumer...");
  const replay = await replayPendingEvents({ dryRun });
  console.log(`Events processed: ${replay.totalProcessed}`);
  for (const [outcome, count] of Object.entries(replay.outcomeCounts)) {
    console.log(`  ${outcome}: ${count}`);
  }

  if (dryRun) {
    console.log("\nDry run complete — no data was written. Re-run without --dry-run to apply.");
  } else {
    console.log("\nBackfill complete.");
    console.log("Reminder: lesson- and puzzle-history backfill was deliberately skipped (see file header) —");
    console.log("existing students' lifetimeEarned reflects games only until live lesson/puzzle events accrue.");
  }

  await mongoose.disconnect();
}

module.exports = {
  backfillEventId,
  ensureGamePlayedRule,
  synthesizeGameEvents,
  replayPendingEvents,
};

// Only auto-run as a CLI script (`node src/scripts/backfillCurrencyLedger.js`).
// Unlike the other one-off scripts in this directory, this file is also
// `require()`d by tests/backfillCurrencyLedger.test.js for its exported
// helpers — without this guard, requiring it for those exports would also
// fire run()'s own mongoose.connect(), racing the test file's own
// connection to a different (in-memory) database.
if (require.main === module) {
  run().catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  });
}
