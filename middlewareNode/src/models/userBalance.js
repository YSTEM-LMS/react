/**
 * UserBalance Schema
 *
 * Read-optimized cache of a user's ledger position, updated alongside
 * every LedgerEntry write. This collection is a cache, not a source of
 * truth — LedgerEntry is; a UserBalance document can always be rebuilt by
 * summing that user's LedgerEntry rows, which is exactly what the
 * historical backfill's replay does on first run.
 *
 * Two fields, deliberately different meanings (see Rev. 2 change 3,
 * "Rank by lifetime earned, not balance"):
 *
 *   - balance:        spendable total. Unused this window (no spend path
 *                      exists yet) but present now so adding one later is
 *                      a feature change, not a schema migration.
 *   - lifetimeEarned:  monotonic sum of positive LedgerEntry amounts only.
 *                      Never decreases. THIS is what the leaderboard reads
 *                      — ranking by spendable balance would mean the top
 *                      of the leaderboard is whichever student has
 *                      redeemed the least, the moment a store ships.
 *
 * A user with no document here (hasn't earned anything yet) must be
 * treated as lifetimeEarned: 0 by any reader — see
 * getLifetimeEarnedOrZero in services/ledgerService.js — never as
 * undefined, which would produce undefined sort ordering in the
 * leaderboard's comparator.
 */

const mongoose = require("mongoose");

const UserBalanceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true, index: true },

    balance: { type: Number, required: true, default: 0 },

    lifetimeEarned: { type: Number, required: true, default: 0, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("UserBalance", UserBalanceSchema);
