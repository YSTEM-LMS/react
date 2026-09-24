/**
 * Currency Anomaly Monitoring Scheduler
 *
 * Flags — never blocks — students whose currency earn rate over the last
 * 24h significantly exceeds the population's. Per Karthik's ledger plan,
 * Week 3 hardening: "anomaly-monitoring scheduled job; flag, don't
 * auto-block, users whose earn rate significantly exceeds the median."
 *
 * Deliberately flag-only: cooldowns and daily caps (ledgerService.js) are
 * the actual enforcement layer and already reject an award before it's
 * written. This job exists for the case those miss — a student who stays
 * under every individual action's cap but still earns at an outlier rate
 * across many different actions combined, which no single ActionRule can
 * see. A human reviews flags; nothing here mutates a balance or an event.
 *
 * Detection: median absolute deviation (MAD) over each user's last-24h
 * LedgerEntry total, rather than mean + standard deviation — a
 * mean-based threshold is itself dragged up by the very outliers it's
 * supposed to catch, especially with a small population of earners on
 * any given day. MAD is robust to that.
 *
 * Schedule: hourly ('0 * * * *') — tighter than the nightly analytics
 * summary, since a currency exploit is worth catching same-day, not
 * next-day.
 *
 * Output collection: currencyAnomalyFlags
 *   { userId, date, totalEarned24h, medianEarned24h, deviationScore,
 *     createdAt }
 * One flag per user per run where the threshold is exceeded — not
 * deduplicated across runs, so a sustained anomaly produces a flag every
 * hour it persists; a reviewer scanning the collection sees how long it's
 * been going on, which is itself useful signal.
 */

const schedule = require("node-schedule");
const mongoose = require("mongoose");
const LedgerEntry = require("../models/ledgerEntry");

const LOOKBACK_MS = 24 * 60 * 60 * 1000;
// A user's 24h total must be at least this many MADs above the median to
// flag — 3.5 is a conventional "clearly an outlier" threshold for MAD-based
// detection (see Iglewicz & Hoaglin), chosen over the more common z-score
// equivalent (~3) specifically because MAD already discounts the outliers
// themselves; no extra slack needed to compensate for that.
const MAD_THRESHOLD = 3.5;
// Consistency constant that makes MAD comparable to a standard deviation
// under a normal distribution — standard for this technique.
const MAD_CONSISTENCY_CONSTANT = 1.4826;
// Skip the check entirely below this many earners in the window — MAD is
// meaningless (or trivially triggers on any two different values) with a
// tiny sample, so a quiet night doesn't produce false flags.
const MIN_EARNERS_FOR_DETECTION = 5;

function median(sortedNumbers) {
  const n = sortedNumbers.length;
  const mid = Math.floor(n / 2);
  return n % 2 === 0 ? (sortedNumbers[mid - 1] + sortedNumbers[mid]) / 2 : sortedNumbers[mid];
}

/**
 * Computes each user's total positive LedgerEntry amount within the
 * lookback window. Returns a Map<userId string, total>.
 */
async function computeEarnedTotals(since) {
  const rows = await LedgerEntry.aggregate([
    { $match: { occurredAt: { $gte: since }, amount: { $gt: 0 } } },
    { $group: { _id: "$userId", total: { $sum: "$amount" } } },
  ]);

  const totals = new Map();
  for (const row of rows) {
    totals.set(String(row._id), row.total);
  }
  return totals;
}

/**
 * Runs one detection pass and returns the flags it would raise (or did
 * raise, if persist is true) — split out from the scheduled job itself so
 * it's directly testable without node-schedule or a live cron tick.
 */
async function detectAnomalies({ now = new Date(), persist = true } = {}) {
  const since = new Date(now.getTime() - LOOKBACK_MS);
  const totals = await computeEarnedTotals(since);

  const values = Array.from(totals.values());
  if (values.length < MIN_EARNERS_FOR_DETECTION) {
    return { flagged: [], skipped: true, reason: "too few earners in window", earnerCount: values.length };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const med = median(sorted);
  const absDeviations = sorted.map((v) => Math.abs(v - med)).sort((a, b) => a - b);
  const mad = median(absDeviations);

  // A zero MAD means at least half the population sits exactly at the
  // median — but that splits into two very different cases:
  //   - everyone is at the median (no deviations at all): nothing to
  //     compare against, correctly nothing to flag.
  //   - a majority sits at the median and a minority doesn't: the normal
  //     "divide by MAD" formula breaks (division by zero), but this is
  //     actually the STRONGEST possible signal, not the weakest — "almost
  //     everyone earned exactly X" makes any nonzero deviation from X
  //     stand out completely on its own, with no scaled score needed.
  const allAtMedian = absDeviations.every((d) => d === 0);
  if (mad === 0) {
    if (allAtMedian) {
      return { flagged: [], skipped: true, reason: "zero deviation in window", earnerCount: values.length };
    }

    const flagged = [];
    for (const [userId, total] of totals.entries()) {
      if (total !== med) {
        flagged.push({ userId, date: now, totalEarned24h: total, medianEarned24h: med, deviationScore: Infinity });
      }
    }
    if (persist && flagged.length > 0) {
      await persistFlags(flagged);
    }
    return { flagged, skipped: false, earnerCount: values.length, medianEarned24h: med, mad: 0 };
  }

  const flagged = [];
  for (const [userId, total] of totals.entries()) {
    // 0.6745 normalizes the modified z-score so a MAD-based deviation is
    // comparable to a standard z-score threshold — the standard formula.
    const deviationScore = (0.6745 * (total - med)) / mad;
    if (deviationScore >= MAD_THRESHOLD) {
      flagged.push({
        userId,
        date: now,
        totalEarned24h: total,
        medianEarned24h: med,
        deviationScore,
      });
    }
  }

  if (persist && flagged.length > 0) {
    await persistFlags(flagged);
  }

  return { flagged, skipped: false, earnerCount: values.length, medianEarned24h: med, mad };
}

async function persistFlags(flagged) {
  const db = mongoose.connection.db;
  await db.collection("currencyAnomalyFlags").insertMany(
    flagged.map((f) => ({ ...f, userId: new mongoose.Types.ObjectId(f.userId), createdAt: new Date() }))
  );
}

async function runAnomalyCheck() {
  console.log("[currencyAnomaly] Starting hourly anomaly check...");
  try {
    const result = await detectAnomalies();
    if (result.skipped) {
      console.log(`[currencyAnomaly] Skipped: ${result.reason} (earners=${result.earnerCount})`);
      return;
    }
    if (result.flagged.length > 0) {
      console.warn(`[currencyAnomaly] Flagged ${result.flagged.length} user(s) for review.`);
    } else {
      console.log(`[currencyAnomaly] No anomalies (earners=${result.earnerCount}, median=${result.medianEarned24h}).`);
    }
  } catch (err) {
    console.error("[currencyAnomaly] Check failed:", err.message);
  }
}

// Hourly, on the hour. Skipped under Jest — same reasoning as
// currencyConsumer's NODE_ENV guard (services/currencyConsumer.js): a
// live node-schedule job registered at require-time leaves an open timer
// handle that Jest has to wait out (or forcibly kill) on every test run
// that imports this file, including indirectly via server.js.
if (process.env.NODE_ENV !== "test") {
  schedule.scheduleJob("0 * * * *", runAnomalyCheck);
  console.log("[currencyAnomaly] Scheduler registered — runs hourly.");
}

module.exports = { detectAnomalies, runAnomalyCheck, computeEarnedTotals, median };
