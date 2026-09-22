/**
 * Badges Routes
 *
 * API endpoints for badge/achievement system.
 * Handles badge catalog retrieval, user badge status, and awarding badges.
 *
 * All routes below /catalog require a valid JWT. :userId is treated as a
 * username (matches UserBadges.userId) and must equal the authenticated
 * user — the same "operate only on your own record" pattern as
 * PUT /user/profile — so no student can read or trigger awards for another
 * account by guessing/enumerating usernames.
 *
 * Endpoints:
 * - GET /badges/catalog - Get all available badges (public)
 * - GET /badges/:userId - Get badges earned by a user (self only)
 * - POST /badges/:userId/check-and-award - Check eligibility and award badges (self only)
 */

const express = require("express");
const { BADGE_CATALOG } = require("../badges/catalog");
const { getEarned, awardIfEligible } = require("../badges/service");
const requireAuth = require("../middleware/requireAuth");
const requireSelf = require("../middleware/requireSelf");
const { computeBadgePredicates } = require("../badges/predicates");

const router = express.Router();

/**
 * GET /badges/catalog
 * Returns the complete catalog of all available badges
 */
router.get("/catalog", (req, res) => {
  res.json({ badges: BADGE_CATALOG });
});

/**
 * GET /badges/:userId
 * Retrieves all badges earned by a specific user
 */
router.get("/:userId", requireAuth, requireSelf("userId"), async (req, res) => {
  try {
    const earned = await getEarned(req.params.userId);
    res.json({ earned });
  } catch (err) {
    console.error("GET /badges/:userId:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST /badges/:userId/check-and-award
 * Recomputes the caller's real stats server-side (never trusts a client-
 * supplied predicates body — see computeBadgePredicates) and awards any
 * newly eligible badges.
 */
router.post("/:userId/check-and-award", requireAuth, requireSelf("userId"), async (req, res) => {
  try {
    const predicates = await computeBadgePredicates(req.params.userId);
    const awarded = await awardIfEligible(req.params.userId, predicates);
    res.json({ awarded });
  } catch (err) {
    console.error("POST /badges/:userId/check-and-award:", err.message);
    res.status(err.status || 500).json({ error: err.status ? err.message : "Server error" });
  }
});

module.exports = router;
