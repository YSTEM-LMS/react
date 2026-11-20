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
 * - minRating: Minimum puzzle difficulty (default: 0)
 * - maxRating: Maximum puzzle difficulty (default: 4000)
 *
 * @returns {Array} Array of randomly selected puzzles
 */
router.get("/random", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const theme = typeof req.query.theme === "string" ? req.query.theme.trim() : "";
    const minRating = parseInt(req.query.minRating) || 0;
    const maxRating = parseInt(req.query.maxRating) || 4000;

    const pipeline = [
      { $match: { Rating: { $gte: minRating, $lte: maxRating } } },
    ];

    if (theme) {
      // Themes is a space-separated token string; match on a whole token so
      // "pin" doesn't also match "pinPossible", etc.
      const escapedTheme = theme.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const themeTokenRegex = new RegExp(`(^|\\s)${escapedTheme}(\\s|$)`, "i");
      pipeline.push({ $match: { Themes: themeTokenRegex } });
    }

    pipeline.push({ $sample: { size: limit } });

    const puzzlesArray = await puzzles.aggregate(pipeline);
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
 * Splits a puzzle's stored `Moves` into its raw UCI tokens. The stored line
 * is the full Lichess answer key: it starts with the opponent's move that
 * creates the position shown to the player, then alternates opponent/solver
 * (index 0, 2, 4, ... = opponent; 1, 3, 5, ... = solver), ending on a solver
 * move — so the token count is always even and at least 2.
 */
function allMoves(expected) {
  return (expected || "").trim().split(/\s+/).filter(Boolean);
}

/**
 * True if a puzzle's stored answer key has the shape every real puzzle has:
 * an even number of moves, at least one opponent/solver pair. A puzzle
 * document that doesn't (bad import, hand-edited seed data, etc.) can't be
 * verified at all, so it must be rejected rather than silently treated as
 * solved or unsolvable.
 */
function isValidAnswerKey(expected) {
  const moves = allMoves(expected);
  return moves.length >= 2 && moves.length % 2 === 0;
}

/**
 * Pulls out just the solver's half of the answer key (the odd indices — see
 * allMoves() above). Puzzles.tsx's playComputerMove() plays the opponent's
 * moves automatically and never submits them; playedMovesRef, what actually
 * reaches this route as `moves`, holds only the solver's own moves. Comparing
 * against the full line rejected every real submission.
 */
function solverMoves(expected) {
  return allMoves(expected).filter((_, i) => i % 2 === 1);
}

/**
 * Verifies a client-submitted move sequence against the solver's half of a
 * puzzle's stored answer key (see solverMoves() above). Returns true only if
 * the sequences have the same length and every move matches positionally.
 *
 * The client is sent the full `Moves` line to drive the interactive
 * play-through, so this only proves the submitted moves match the solver's
 * moves — it doesn't prove the student played them on the board rather than
 * copying them from the puzzle data.
 */
function movesMatch(submitted, expected) {
  if (!Array.isArray(submitted)) return false;

  const expectedMoves = solverMoves(expected);
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

      const puzzle = await puzzles.findOne({ PuzzleId: puzzleId });

      if (!puzzle) {
        return res.status(404).json({
          error: "Puzzle not found",
        });
      }

      if (!isValidAnswerKey(puzzle.Moves)) {
        return res.status(400).json({
          error: "This puzzle's answer key is invalid and cannot be verified",
        });
      }

      if (!movesMatch(moves, puzzle.Moves)) {
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
