/**
 * Currency Event Producers
 *
 * The single choke point every feature module goes through to record a
 * currency-earning action — per Jimmy's ledger plan, "no feature module
 * imports anything from the currency service directly; every award
 * happens purely through an emitted event." A feature route calls one of
 * these after its own write succeeds; nothing here decides whether or how
 * much currency to award — that's ActionRule + the consumer's job
 * (services/ledgerService.js, services/currencyConsumer.js). This module
 * only ever inserts an ActionEvent.
 *
 * Deliberately real, not a mock/stub sink: earlier drafts of this plan
 * called for a fake in-memory sink Jimmy's lane could test against before
 * Karthik's consumer existed. That consumer is real now (see
 * services/currencyConsumer.js), so producing into a parallel fake
 * collection would mean maintaining two implementations that could drift
 * — this writes directly to the real ActionEvent collection, and tests
 * verify that against a real in-memory MongoDB instance instead.
 *
 * eventId is deterministic per producer (documented on each function) so
 * a retried request, a duplicate delivery, or a page refresh mid-request
 * can never double-emit the same real-world completion — the same
 * property gameResults.js gets from gameId and the backfill gets from its
 * synthetic ids.
 */

const ActionEvent = require("../models/actionEvent");

const DUPLICATE_KEY_ERROR = 11000;

/**
 * Inserts one ActionEvent, treating a duplicate eventId as a successful
 * no-op rather than an error — the caller doesn't need to know or care
 * whether this exact completion was already recorded (e.g. a retried
 * request after a dropped response). Returns { emitted: true } for a
 * fresh insert, { emitted: false, duplicate: true } for an already-seen
 * eventId.
 */
async function emit({ eventId, actionKey, userId, metadata = {}, occurredAt = new Date() }) {
  try {
    await ActionEvent.create({
      eventId,
      actionKey,
      userId,
      metadata,
      status: "pending",
      occurredAt,
    });
    return { emitted: true, duplicate: false, eventId };
  } catch (err) {
    if (err && err.code === DUPLICATE_KEY_ERROR) {
      return { emitted: false, duplicate: true, eventId };
    }
    throw err;
  }
}

/**
 * Emits lesson.completed. Called from routes/lessons.js's
 * /updateLessonCompletion handler, only after users.updateOne() reports
 * modifiedCount > 0 — i.e. only on a real forward-progress write, never
 * on a request that re-sent an already-completed lesson number (which
 * the route already treats as a 304 no-op today).
 *
 * eventId is `lesson:<userId>:<piece>:<lessonNum>` — deterministic per
 * (student, piece, lesson number) triple, matching the backfill's own
 * `backfill:lesson:...` naming convention (see
 * scripts/backfillCurrencyLedger.js) so the two families of ids are
 * visually distinguishable in the collection without ever colliding.
 */
async function emitLessonCompleted({ userId, piece, lessonNum, occurredAt }) {
  return emit({
    eventId: `lesson:${userId}:${piece}:${lessonNum}`,
    actionKey: "lesson.completed",
    userId,
    metadata: { piece, lessonNum },
    occurredAt,
  });
}

module.exports = {
  emit,
  emitLessonCompleted,
};
