/**
 * LedgerEntry Schema
 *
 * Append-only, source of truth for currency balance. Never a running
 * total — every award is its own immutable row, the same computed-on-read
 * philosophy GameResults uses for chess record/score (see
 * models/gameResults.js): change how points are computed and every
 * historical entry is still exactly what it says, with nothing to drift
 * or backfill in the ledger itself.
 *
 * `eventId` carries the same value as the ActionEvent it was created from
 * and is unique here too — this is the actual idempotency guarantee for
 * the whole pipeline. The consumer's insert either succeeds once or fails
 * with a duplicate-key error that it treats as "already processed,
 * nothing to do" (mirroring gameResults.js's `err.code === 11000` handling),
 * so a re-delivered or retried event can never double-pay.
 *
 * Amounts are positive-only this window — no spend path exists yet
 * (deferred per the currency rollout plan). UserBalance.lifetimeEarned is
 * the running sum of these entries; the field is named lifetimeEarned
 * rather than balance so that when a spend path does ship, ranking logic
 * that already reads lifetimeEarned doesn't start rewarding students for
 * not spending.
 */

const mongoose = require("mongoose");

const LedgerEntrySchema = new mongoose.Schema(
  {
    // Idempotency key — matches the source ActionEvent.eventId exactly.
    eventId: { type: String, required: true, unique: true, index: true },

    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },

    actionKey: { type: String, required: true, index: true },

    // Positive-only this window. Kept as a plain Number (not unsigned) so
    // a future spend path is a validation change, not a schema migration.
    amount: { type: Number, required: true },

    // When the underlying action happened (copied from ActionEvent.occurredAt),
    // not when this row was written — a backfilled entry's history should
    // read as history, not as having happened at backfill time.
    occurredAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

// A user's full ledger history, newest first — the query the future spend
// path and any per-student ledger view will both want.
LedgerEntrySchema.index({ userId: 1, occurredAt: -1 });

module.exports = mongoose.model("LedgerEntry", LedgerEntrySchema);
