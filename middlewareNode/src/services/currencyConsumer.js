/**
 * Currency Consumer
 *
 * Claims pending ActionEvent documents and runs each through
 * ledgerService.processEvent(), the shared rules engine. This is the
 * "polling worker on status: 'pending'" the currency rollout plan
 * specifies in place of a Redis consumer group (Rev. 2, "Drop Redis from
 * this window") — no broker, no consumer-group semantics to reimplement,
 * just a plain query against a status field.
 *
 * A Mongo change stream is the noted upgrade path once Week 0's
 * replica-set gate passes (change streams require one); polling works
 * unconditionally and is what ships by default. Swapping the trigger
 * later doesn't change processEvent() or the ActionEvent schema at all.
 *
 * Crash safety: an event is claimed (status: "pending" -> "claimed") via
 * findOneAndUpdate, which is atomic — two consumer processes racing on
 * the same event can never both claim it. If the process dies after
 * claiming but before finishing, the event is stuck as "claimed," not
 * silently lost or double-processed; requeueStuckClaims() below recovers
 * it. A production deployment should call that on startup and on an
 * interval.
 */

const ActionEvent = require("../models/actionEvent");
const { processEvent } = require("./ledgerService");

const DEFAULT_BATCH_SIZE = 25;
const DEFAULT_POLL_INTERVAL_MS = 5000;
// How long an event may sit "claimed" before being treated as abandoned
// by a crashed worker and requeued to "pending."
const DEFAULT_CLAIM_STALE_MS = 5 * 60 * 1000;

/**
 * Atomically claims one pending event, oldest first. Returns null if
 * nothing is pending.
 */
async function claimNextEvent() {
  return ActionEvent.findOneAndUpdate(
    { status: "pending" },
    { $set: { status: "claimed" } },
    { sort: { occurredAt: 1 }, new: true }
  );
}

/**
 * Processes a single claimed event through the rules engine and records
 * the outcome on the ActionEvent itself. Every outcome except "awarded"/
 * "duplicate" is still marked "processed" — a missing rule, an inactive
 * rule, a cooldown, or a daily cap are all legitimate, expected reasons
 * an event doesn't pay out, not failures. Only an actual thrown error
 * (a bad DB write, a schema violation) is marked "failed."
 */
async function processClaimedEvent(event) {
  try {
    const result = await processEvent(event);
    await ActionEvent.updateOne(
      { _id: event._id },
      { $set: { status: "processed", processedAt: new Date() } }
    );
    return result;
  } catch (err) {
    await ActionEvent.updateOne(
      { _id: event._id },
      {
        $set: {
          status: "failed",
          processedAt: new Date(),
          failureReason: (err && err.message) || String(err),
        },
      }
    );
    return { outcome: "error", eventId: event.eventId, actionKey: event.actionKey, error: err };
  }
}

/**
 * Drains up to `batchSize` pending events in one pass. Returns the list
 * of per-event outcomes. Used directly by tests and by runOnce() below;
 * exported separately so a caller (e.g. an HTTP admin trigger, or the
 * backfill) can drive processing without needing the interval timer.
 */
async function drainBatch(batchSize = DEFAULT_BATCH_SIZE) {
  const results = [];
  for (let i = 0; i < batchSize; i++) {
    const event = await claimNextEvent();
    if (!event) break;
    results.push(await processClaimedEvent(event));
  }
  return results;
}

/**
 * Requeues events stuck in "claimed" past claimStaleMs — the recovery
 * path for a worker that crashed mid-processing. Safe to call
 * concurrently with drainBatch(): a requeue only ever moves a stale
 * "claimed" event back to "pending" for someone to claim again; it never
 * touches "processed"/"failed" events.
 */
async function requeueStuckClaims(claimStaleMs = DEFAULT_CLAIM_STALE_MS) {
  const staleBefore = new Date(Date.now() - claimStaleMs);
  const result = await ActionEvent.updateMany(
    { status: "claimed", updatedAt: { $lt: staleBefore } },
    { $set: { status: "pending" } }
  );
  return result.modifiedCount || 0;
}

let pollTimer = null;

/**
 * Starts the polling loop. Call once at server boot (see server.js).
 * Idempotent — calling start() while already running is a no-op rather
 * than stacking timers.
 */
function start({ pollIntervalMs = DEFAULT_POLL_INTERVAL_MS, batchSize = DEFAULT_BATCH_SIZE } = {}) {
  if (pollTimer) return;

  const tick = async () => {
    try {
      await requeueStuckClaims();
      await drainBatch(batchSize);
    } catch (err) {
      console.error("currencyConsumer: poll tick failed:", err.message);
    }
  };

  pollTimer = setInterval(tick, pollIntervalMs);
  // Fire once immediately rather than waiting a full interval on boot.
  tick();
}

function stop() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

module.exports = {
  claimNextEvent,
  processClaimedEvent,
  drainBatch,
  requeueStuckClaims,
  start,
  stop,
};
