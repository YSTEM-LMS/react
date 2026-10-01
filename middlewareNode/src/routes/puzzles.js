/**
 * Puzzles Routes
 *
 * API endpoints for retrieving chess puzzles from the database.
 * Puzzles are sourced from Lichess and stored in MongoDB.
 *
 * Features:
 * - Get all puzzles
 * - Get random selection of puzzles
 * - Filter puzzles by difficulty and themes
 */

const express = require("express");
const passport = require("passport");
const router = express.Router();
const puzzles = require("../models/puzzles");
const { emitPuzzleSolved } = require("../services/currencyEvents");

/**
 * GET /puzzles/list
 *
 * Retrieves all chess puzzles from the database.
 * Returns array of puzzle objects without MongoDB _id field.
 *
 * @returns {Array} Array of all puzzles
 */
router.get("/list", async (req, res) => {
  try {
    const puzzlesArray = await puzzles.find({}, { _id: 0 });
    res.status(200).json(puzzlesArray);
  } catch (error) {
    console.error(error.message);
    res.status(500).json("Server error");
  }
});

/**
 * GET /puzzles/random
 *
 * Retrieves a random selection of chess puzzles.
 * Useful for providing variety in puzzle practice sessions.
 *
 * Query Parameters:
 * - limit: Number of random puzzles to return (default: 20)
 *
 * @returns {Array} Array of randomly selected puzzles
 */
router.get("/random", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const puzzlesArray = await puzzles.aggregate([
      { $sample: { size: limit } },
    ]);
    res.status(200).json(puzzlesArray);
  } catch (error) {
    console.error(error.message);
    res.status(500).json("Server error");
  }
});

/**
 * True if a submitted move matches the puzzle's expected move for that
 * position, using the exact same leniency Puzzles.tsx's handlePlayerMove
 * already applies client-side:
 *
 *   playerAttemptedMove === expectedPlayerMove ||
 *   playerAttemptedMove === expectedPlayerMove.substring(0, 4)
 *
 * i.e. a 4-character move (no promotion piece specified) is accepted even
 * when the real solution is 5 characters (e.g. "e7e8q") — the client
 * already lets a student complete a promotion puzzle without explicitly
 * picking a piece, so the server has to accept that same shape or it
 * would reject a move the client UI already treated as solved. Comparison
 * is case-insensitive to match how the client builds its own move string.
 */
function moveMatches(submitted, expected) {
  const s = (submitted || "").toLowerCase();
  const e = (expected || "").toLowerCase();
  return s === e || s === e.substring(0, 4);
}

/**
 * Verifies a client-submitted move sequence against a puzzle's stored
 * answer key (space-separated UCI moves). Returns true only if the
 * sequences have the same length and every move matches positionally.
 *
 * This isn't a complete defense — a client that reads the puzzle's own
 * `moves` field (already sent to the client to drive the interactive
 * play-through) and submits it verbatim without actually playing will
 * still pass. What it does stop is the cheaper, more likely attack this
 * route originally allowed outright: looping over puzzleIds with no
 * solve data at all. Raising the bar to "must know the real solution
 * string," not "must have nothing."
 */
function movesMatch(submitted, expected) {
  if (!Array.isArray(submitted)) return false;

  const expectedMoves = (expected || "").trim().split(/\s+/).filter(Boolean);
  if (submitted.length === 0 || submitted.length !== expectedMoves.length) {
    return false;
  }

  return expectedMoves.every((expectedMove, i) => moveMatches(submitted[i], expectedMove));
}

/**
 * POST /puzzles/solved
 *
 * Records a successfully completed puzzle as a currency-earning action —
 * but only once the submitted move sequence is verified against the
 * puzzle's stored answer key. A bare puzzleId is no longer sufficient:
 * without this, any authenticated caller could loop over every puzzleId
 * in the catalog and farm currency for puzzles never attempted. See the
 * limitation noted on movesMatch() above for what this does and doesn't
 * defend against.
 *
 * Body:
 * - puzzleId: ID of the completed puzzle
 * - moves: array of UCI move strings the player submitted, in order,
 *   matching the puzzle's own `moves` answer key exactly
 *
 * Only authenticated users can earn currency.
 * Guests can still play puzzles, but there is no account to credit.
 */
router.post(
  "/solved",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const { puzzleId, moves } = req.body;

      if (!puzzleId) {
        return res.status(400).json({
          error: "puzzleId is required",
        });
      }
      if (!Array.isArray(moves) || moves.length === 0) {
        return res.status(400).json({
          error: "moves is required and must be a non-empty array of UCI move strings",
        });
      }

      const puzzle = await puzzles.findOne({ puzzleId });

      if (!puzzle) {
        return res.status(404).json({
          error: "Puzzle not found",
        });
      }

      if (!movesMatch(moves, puzzle.moves)) {
        return res.status(400).json({
          error: "Submitted moves do not match the puzzle's solution",
        });
      }

      const result = await emitPuzzleSolved({
        userId: req.user._id,
        puzzleId,
      });

      return res.status(200).json(result);
    } catch (error) {
      console.error(
        "currencyEvents: failed to emit puzzle.solved:",
        error.message,
      );
      return res.status(500).json({
        error: "Failed to record puzzle completion",
      });
    }
  },
);

module.exports = router;
