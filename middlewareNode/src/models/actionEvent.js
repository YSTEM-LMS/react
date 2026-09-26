/**
 * ActionEvent Schema
 *
 * Append-only raw log of "something happened that might earn currency" —
 * one document per real-world action (a lesson completed, a puzzle solved),
 * written durably before anything decides whether it pays out.
 *
 * This is a plain MongoDB collection, not a message broker (see Rev. 2 of
 * the currency rollout plan, "Drop Redis from this window"): nothing here
 * needs consumer groups or broker-grade throughput at current scale, and a
 * collection gets the same durability/replay/audit properties for free,
 * with no new ops dependency.
 *
 * `eventId` is unique, which is the idempotency key all the way down the
 * pipeline — the same pattern GameResults uses `gameId` for. A producer
 * (or the historical backfill) can safely retry an insert; a duplicate
 * `eventId` is rejected by the unique index rather than silently
 * double-processed.
 *
 * `status` drives the consumer: it claims a batch of "pending" events,
 * processes them, and marks each "processed" or "failed" so a crash
 * mid-batch never loses or silently re-skips work. See
 * services/currencyConsumer.js.
 */

const mongoose = require("mongoose");

const ActionEventSchema = new mongoose.Schema(
  {
    // Idempotency key. Producers mint this deterministically (e.g.
    // `lesson:<userId>:<lessonId>:<completedAt-ms>`); the historical
    // backfill mints synthetic ones (e.g. `backfill:lesson:<userId>:<piece>:<n>`)
    // so it is safely re-runnable against the same source data.
    eventId: { type: String, required: true, unique: true, index: true },

    // Matches an ActionRule.actionKey — e.g. "lesson.completed", "puzzle.solved".
    actionKey: { type: String, required: true, index: true },

    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },

    // Action-specific payload (lessonId, piece, difficulty, ...). Opaque to
    // the consumer beyond what a given ActionRule's conditions inspect.
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },

    // Compound-indexed with actionKey below — the consumer's claim query
    // and the cooldown/daily-cap checks both filter on status + userId +
    // actionKey + occurredAt.
    status: {
      type: String,
      enum: ["pending", "processed", "failed"],
      default: "pending",
      index: true,
    },

    // Set once the consumer finishes with this event, whichever way.
    processedAt: { type: Date, default: null },

    // Populated only when status is "failed" — the rules-engine or ledger
    // error that occurred, so a stuck event is diagnosable without log
    // spelunking.
    failureReason: { type: String, default: null },

    // When the underlying action actually happened — not when this record
    // was written. Backfilled events set this to the historical date so
    // cooldown/daily-cap windows evaluate correctly against real history.
    occurredAt: { type: Date, required: true, default: Date.now, index: true },
  },
  { timestamps: true }
);

// The consumer's core query: "give me pending events for this action,
// oldest first." Also serves cooldown/daily-cap lookups scoped to a single
// user+action.
ActionEventSchema.index({ status: 1, actionKey: 1, occurredAt: 1 });
ActionEventSchema.index({ userId: 1, actionKey: 1, occurredAt: -1 });

module.exports = mongoose.model("ActionEvent", ActionEventSchema);
