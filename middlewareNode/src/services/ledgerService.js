/**
 * Ledger Service
 *
 * The rules engine + idempotent ledger writer at the center of the
 * currency pipeline. Turns one ActionEvent into, at most, one LedgerEntry
 * plus a matching UserBalance update — or determines the event should not
 * pay out, and says why.
 *
 * Deliberately framework-agnostic about *how* an ActionEvent got here: the
 * live polling consumer (currencyConsumer.js) and the historical backfill
 * (both Week 2+ deliverables) call the same processEvent() so a bug fixed
 * here fixes both paths, and the backfill genuinely exercises this code
 * rather than a separate parallel implementation.
 *
 * No MongoDB transaction here by default — see the file-level comment on
 * why below applyLedgerEntry. Set LEDGER_USE_TRANSACTIONS=true once Week 0's
 * replica-set gate (`rs.status()` in mongosh) confirms one is available.
 */

const mongoose = require("mongoose");
const ActionRule = require("../models/actionRule");
const LedgerEntry = require("../models/ledgerEntry");
const UserBalance = require("../models/userBalance");

const DUPLICATE_KEY_ERROR = 11000;

/**
 * Reads a user's lifetimeEarned, treating "no UserBalance document yet"
 * as 0 rather than undefined. Used by the leaderboard swap (Jimmy's lane)
 * and anywhere else that needs a safe-to-sort number for every user,
 * including ones who have never earned anything.
 */
async function getLifetimeEarnedOrZero(userId) {
  const doc = await UserBalance.findOne({ userId }, { lifetimeEarned: 1, _id: 0 });
  return doc ? doc.lifetimeEarned : 0;
}

/**
 * Cooldown check: has this user actually been PAID for this action within
 * the rule's cooldownSeconds? A cooldownSeconds of 0 means "no cooldown"
 * and this always returns false without querying.
 *
 * Deliberately checks LedgerEntry, not ActionEvent.status — whether an
 * award happened is exactly what LedgerEntry records, and status is a
 * bookkeeping concern owned by whoever is driving events through this
 * function (the live consumer marks "processed"; the historical backfill
 * may not use the same lifecycle at all). Checking the ledger keeps
 * processEvent() correct regardless of caller.
 */
async function isWithinCooldown(LedgerEntry, userId, actionKey, cooldownSeconds, asOf) {
  if (!cooldownSeconds) return false;
  const since = new Date(asOf.getTime() - cooldownSeconds * 1000);
  const recent = await LedgerEntry.findOne({
    userId,
    actionKey,
    occurredAt: { $gte: since, $lt: asOf },
  });
  return Boolean(recent);
}

/**
 * Daily-cap check: has this user already been paid dailyCap times for
 * this action today (UTC calendar day, matching how other daily windows
 * in this codebase are computed)? A dailyCap of 0 means "no cap." Checks
 * LedgerEntry for the same reason isWithinCooldown does.
 */
async function hasHitDailyCap(LedgerEntry, userId, actionKey, dailyCap, asOf) {
  if (!dailyCap) return false;
  const dayStart = new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), asOf.getUTCDate()));
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const countToday = await LedgerEntry.countDocuments({
    userId,
    actionKey,
    occurredAt: { $gte: dayStart, $lt: dayEnd },
  });
  return countToday >= dailyCap;
}

/**
 * Writes one LedgerEntry and updates the matching UserBalance for a
 * validated, rule-approved award. Idempotent on eventId: a duplicate
 * insert is caught and treated as "already applied," not an error —
 * exactly the pattern gameResults.js uses for gameId (see that file's
 * `err.code === 11000` handling).
 *
 * Not wrapped in a MongoDB multi-document transaction by default.
 * Standalone MongoDB instances (the common case for this project's dev/
 * staging setups) don't support them at all, and Week 0's plan explicitly
 * gates this: run `rs.status()` and report back before assuming one is
 * available. Until that's confirmed, this uses the single-document
 * fallback the plan calls out — write the ledger entry first (the correct
 * source of truth), then update the cache; if the process dies between
 * the two, UserBalance is rebuildable from LedgerEntry, so the cache is
 * merely stale, never wrong. Set LEDGER_USE_TRANSACTIONS=true to switch
 * to a real transaction once a replica set is confirmed.
 */
async function applyLedgerEntry({ eventId, userId, actionKey, amount, occurredAt }) {
  const useTransactions = process.env.LEDGER_USE_TRANSACTIONS === "true";

  if (useTransactions) {
    const session = await mongoose.startSession();
    try {
      let duplicate = false;
      await session.withTransaction(async () => {
        try {
          await LedgerEntry.create([{ eventId, userId, actionKey, amount, occurredAt }], { session });
        } catch (err) {
          if (err && err.code === DUPLICATE_KEY_ERROR) {
            duplicate = true;
            return;
          }
          throw err;
        }
        await UserBalance.updateOne(
          { userId },
          { $inc: { balance: amount, lifetimeEarned: amount } },
          { upsert: true, session }
        );
      });
      return { applied: !duplicate, duplicate };
    } finally {
      await session.endSession();
    }
  }

  // Single-document fallback (default): ledger entry first, then cache.
  try {
    await LedgerEntry.create({ eventId, userId, actionKey, amount, occurredAt });
  } catch (err) {
    if (err && err.code === DUPLICATE_KEY_ERROR) {
      return { applied: false, duplicate: true };
    }
    throw err;
  }

  await UserBalance.updateOne(
    { userId },
    { $inc: { balance: amount, lifetimeEarned: amount } },
    { upsert: true }
  );

  return { applied: true, duplicate: false };
}

/**
 * Processes one ActionEvent end to end against the rules engine: look up
 * the ActionRule, check active/cooldown/dailyCap, and write the ledger
 * entry if everything clears. Returns a result object describing exactly
 * what happened, for the caller (consumer or backfill) to log and use to
 * set ActionEvent.status.
 *
 * Does NOT mutate the ActionEvent itself — callers own that, since the
 * live consumer and the backfill replay have different ideas about what
 * "processed" should mean for a historical vs. a live event.
 *
 * @param {object} event - a plain object shaped like an ActionEvent
 *   ({ eventId, userId, actionKey, occurredAt, metadata }), so this can be
 *   called with either a real Mongoose document or a synthetic backfill
 *   record without either needing to be a full ActionEvent.
 */
async function processEvent(event) {
  const { eventId, userId, actionKey, occurredAt } = event;

  const rule = await ActionRule.findOne({ actionKey });
  if (!rule) {
    return { outcome: "no_rule", eventId, actionKey };
  }
  if (!rule.active) {
    return { outcome: "rule_inactive", eventId, actionKey };
  }

  const asOf = occurredAt instanceof Date ? occurredAt : new Date(occurredAt);

  if (await isWithinCooldown(LedgerEntry, userId, actionKey, rule.cooldownSeconds, asOf)) {
    return { outcome: "cooldown", eventId, actionKey };
  }
  if (await hasHitDailyCap(LedgerEntry, userId, actionKey, rule.dailyCap, asOf)) {
    return { outcome: "daily_cap", eventId, actionKey };
  }

  const { applied, duplicate } = await applyLedgerEntry({
    eventId,
    userId,
    actionKey,
    amount: rule.currencyAmount,
    occurredAt: asOf,
  });

  if (duplicate) {
    return { outcome: "duplicate", eventId, actionKey };
  }
  return { outcome: "awarded", eventId, actionKey, amount: rule.currencyAmount };
}

module.exports = {
  processEvent,
  applyLedgerEntry,
  getLifetimeEarnedOrZero,
  isWithinCooldown,
  hasHitDailyCap,
};
