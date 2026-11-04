/**
 * Internal Game Results Routes  —  /internal/gameResults
 *
 * The chess server's own reporting path, authenticated with CHESS_SERVICE_KEY
 * (middleware/requireServiceKey) instead of a player JWT. See the PvP results
 * plan (v2), target design points 3-4.
 *
 * The middleware only accepts a result for a PvpGame it knows about — one
 * created when a challenge was accepted (routes/challenge.js) — and only when
 * the reported winner/loser (or both drawn players) match that game's two
 * real players. This is what makes a result trustworthy: the chess server
 * decides who won, but the middleware decides whether a game was real.
 *
 * gameId remains the idempotency key: a second report for an already-recorded
 * game returns 200 duplicate: true and writes nothing, same guarantee as the
 * old player-facing POST had.
 */

const express = require("express");
const router = express.Router();
const requireServiceKey = require("../middleware/requireServiceKey");
const GameResults = require("../models/gameResults");
const PvpGame = require("../models/PvpGame");
const { buildRecord, serialize } = require("./gameResults");

/** True when the reported participants are exactly this PvpGame's two players. */
function playersMatch(pvpGame, players) {
  const expected = [pvpGame.white, pvpGame.black].sort();
  const actual = [...players].sort();
  return expected[0] === actual[0] && expected[1] === actual[1];
}

/**
 * POST /internal/gameResults
 * Body: same shape as the old player-facing POST /gameResults.
 * Behind requireServiceKey — the caller is the chess server, not a player.
 */
router.post("/", requireServiceKey, async (req, res) => {
  try {
    const { error, record } = buildRecord(req.body);
    if (error) return res.status(400).json({ success: false, error });

    const pvpGame = await PvpGame.findOne({ gameId: record.gameId });
    if (!pvpGame) {
      return res.status(404).json({ success: false, error: "Game not found" });
    }
    if (!playersMatch(pvpGame, record.players)) {
      return res
        .status(400)
        .json({ success: false, error: "Reported players do not match the accepted game" });
    }

    const existing = await GameResults.findOne({ gameId: record.gameId });
    if (existing) {
      return res.json({ success: true, duplicate: true, gameResult: serialize(existing) });
    }

    // Flip the game to finished before inserting — this is the one write that
    // decides a report "wins", so a concurrent duplicate falls through to the
    // GameResults unique-index race below instead of double-finishing.
    await PvpGame.updateOne({ gameId: record.gameId, status: "active" }, { $set: { status: "finished", finishedAt: new Date() } });

    const created = await GameResults.create({ ...record, source: "chessServer" });
    return res.status(201).json({ success: true, duplicate: false, gameResult: serialize(created) });
  } catch (err) {
    // Unique-index race: another report for the same game won first. That's
    // the idempotency guarantee doing its job, not an error.
    if (err && err.code === 11000) {
      const existing = await GameResults.findOne({ gameId: req.body.gameId });
      if (existing) {
        return res.json({ success: true, duplicate: true, gameResult: serialize(existing) });
      }
    }
    console.error("internalGameResults POST /:", err.message);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

module.exports = router;
