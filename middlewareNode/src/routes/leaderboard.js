/**
 * Leaderboard Routes  —  /leaderboard
 *
 * Student-facing endpoint returning ranked students by their currency
 * ledger standing. Protected by requireAuth (valid JWT, any role) — NOT
 * admin-only, unlike /analytics, since students need to view the
 * leaderboard themselves.
 *
 * `score` reads UserBalance.lifetimeEarned (services/ledgerService.js),
 * not the spendable `balance` field — lifetimeEarned is monotonic (a sum
 * of positive LedgerEntry amounts only), so it can never go down. Ranking
 * by spendable balance instead would mean the day a currency store ships,
 * the top of the leaderboard becomes whoever has redeemed the least —
 * rewarding declining to use the system. See the currency rollout plan,
 * "Rank by lifetime earned, not balance."
 *
 * This replaces the previous engagement formula computed on read from
 * time/streak/activities/badges (utils/studentStats) — that formula is
 * still used elsewhere (e.g. admin analytics) but is no longer this
 * route's score source. A student with no UserBalance document yet (has
 * never earned any currency) reads as lifetimeEarned: 0, not undefined —
 * see the `|| 0` at the score assignment below; without it the sort
 * comparator would produce undefined ordering instead of placing that
 * student last.
 *
 * `score` above measures ENGAGEMENT (via currency earned for engaging
 * actions). Student-vs-student chess results are a different signal
 * (competitive skill), so they are reported alongside it as a separate
 * `chess_score` / `chess_record` and are deliberately NOT added into
 * `score` — blending them would make one number mean two things. Chess
 * weights live in utils/studentStats (PVP_WEIGHT_WIN / _DRAW / _LOSS).
 *
 * Response contract matches LeaderboardModal.tsx exactly:
 *   GET /leaderboard/schools    -> { success, schools: string[] }
 *   GET /leaderboard/countries  -> { success, countries: string[] }
 *   GET /leaderboard/states     -> { success, states: string[] }
 *   GET /leaderboard?country=&state=&school=&search=&sortBy=score|name|chess&sortDir=asc|desc&page=1&limit=10
 *     -> { success, data: { leaderboard: [{id, rank, username, school_name,
 *                            country, state, score, chess_score,
 *                            chess_record: {wins, draws, losses, gamesPlayed},
 *                            avatar_url}],
 *                            pagination: { has_more } } }
 */

const express = require("express");
const router = express.Router();
const Users = require("../models/users");
const { getChessRecords } = require("../utils/studentStats");
const { getAvatarUrl } = require("../utils/avatars");
const { getLifetimeEarnedMap } = require("../services/ledgerService");

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 10;
const MAX_UNFILTERED_CANDIDATES = 500;

/**
 * Builds an exact-match Mongo filter from optional query params.
 * Exact match only for country/state/school (no regex) to avoid ReDoS risk
 * on a student-facing endpoint. Name search uses a bounded, anchor-free
 * regex against username only — acceptable here since it's scoped to a
 * capped candidate set, not run across the full collection unbounded.
 */
function buildUserFilter({ country, state, school, search }) {
  const filter = { role: "student" };
  if (country) filter.country = country;
  if (state) filter.state = state;
  if (school) filter.school = school;
  if (search) filter.username = { $regex: escapeRegex(search), $options: "i" };
  return filter;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// computeScore() (the old time/streak/badge/activity weighted formula)
// was removed here — score now comes from getLifetimeEarnedMap (see the
// module header). utils/studentStats' getUserTimeStats/getUserStreak/
// getActivitiesCompleted/getBadgesEarned still exist and are still used
// elsewhere (e.g. admin analytics); only this route's score source changed.

/**
 * Builds a GET /leaderboard/<field>s handler returning distinct, non-empty
 * values for that field — shared shape for the schools/countries/states
 * filter-dropdown endpoints.
 */
function distinctFilterValuesRoute(field, responseKey) {
  return async (req, res) => {
    try {
      const values = await Users.distinct(field, {
        role: "student",
        [field]: { $nin: ["", null] },
      });
      res.json({ success: true, [responseKey]: values });
    } catch (err) {
      console.error(`leaderboard /${responseKey}:`, err.message);
      res.status(500).json({ success: false, error: "Server error" });
    }
  };
}

/**
 * GET /leaderboard/schools
 * Distinct, non-empty school names for the school filter dropdown.
 */
router.get("/schools", distinctFilterValuesRoute("school", "schools"));

/**
 * GET /leaderboard/countries
 * Distinct, non-empty country values for the country filter dropdown.
 */
router.get("/countries", distinctFilterValuesRoute("country", "countries"));

/**
 * GET /leaderboard/states
 * Distinct, non-empty state values for the state filter dropdown.
 */
router.get("/states", distinctFilterValuesRoute("state", "states"));

/**
 * GET /leaderboard
 * Returns ranked students, optionally filtered/searched, paginated.
 */
router.get("/", async (req, res) => {
  try {
    const { country, state, school, search, sortBy = "score", sortDir = "desc" } = req.query;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || DEFAULT_LIMIT, MAX_LIMIT);
    const skip = (page - 1) * limit;

    const filter = buildUserFilter({ country, state, school, search });
    const isFiltered = Boolean(country || state || school || search);

    let candidates = await Users.find(filter, {
      username: 1,
      country: 1,
      state: 1,
      school: 1,
      avatarKey: 1,
      _id: 1,
    });

    // Unfiltered (global) leaderboard: bound worst-case per-user aggregation
    // cost by capping the candidate set. Known limitation — see backend plan
    // for the precomputed-snapshot approach once roster size requires it.
    if (!isFiltered && candidates.length > MAX_UNFILTERED_CANDIDATES) {
      candidates = candidates.slice(0, MAX_UNFILTERED_CANDIDATES);
    }

    // One batched query for every candidate's chess record and lifetime-
    // earned currency, rather than a per-student round trip inside the
    // map below for either.
    const chessRecords = await getChessRecords(candidates.map((u) => u.username));
    const lifetimeEarnedMap = await getLifetimeEarnedMap(candidates.map((u) => u._id));

    const scored = candidates.map((user) => ({
      id: String(user._id),
      username: user.username,
      school: user.school || null,
      country: user.country || null,
      state: user.state || null,
      avatarUrl: getAvatarUrl(user.avatarKey),
      // A user with no UserBalance document yet (never earned any
      // currency) must read as 0, not undefined — an undefined score
      // would make the sort comparator below produce undefined ordering
      // instead of placing that student last.
      score: lifetimeEarnedMap.get(String(user._id)) || 0,
      chess: chessRecords.get(user.username),
    }));

    const direction = sortDir === "asc" ? 1 : -1;
    if (sortBy === "name") {
      scored.sort((a, b) => direction * a.username.localeCompare(b.username));
    } else if (sortBy === "chess") {
      scored.sort((a, b) => direction * (a.chess.chessScore - b.chess.chessScore));
    } else {
      scored.sort((a, b) => direction * (a.score - b.score));
    }

    const total = scored.length;
    const pageSlice = scored.slice(skip, skip + limit);
    const leaderboard = pageSlice.map((entry, idx) => ({
      id: entry.id,
      rank: skip + idx + 1,
      username: entry.username,
      school_name: entry.school,
      country: entry.country,
      state: entry.state,
      score: entry.score,
      // Separate competitive stat — see the module header on why this is not
      // merged into `score`.
      chess_score: entry.chess.chessScore,
      chess_record: {
        wins: entry.chess.wins,
        draws: entry.chess.draws,
        losses: entry.chess.losses,
        gamesPlayed: entry.chess.gamesPlayed,
      },
      avatar_url: entry.avatarUrl,
    }));

    res.json({
      success: true,
      data: {
        leaderboard,
        pagination: { has_more: skip + limit < total, total },
      },
    });
  } catch (err) {
    console.error("leaderboard /:", err.message);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

module.exports = router;
