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
 * POST /puzzles/solved
 *
 * Records a successfully completed puzzle as a currency-earning action.
 *
 * Body:
 * - puzzleId: ID of the completed puzzle
 *
 * Only authenticated users can earn currency.
 * Guests can still play puzzles, but there is no account to credit.
 */
router.post(
  "/solved",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const { puzzleId } = req.body;

      if (!puzzleId) {
        return res.status(400).json({
          error: "puzzleId is required",
        });
      }

      const puzzle = await puzzles.findOne({ puzzleId });

      if (!puzzle) {
        return res.status(404).json({
          error: "Puzzle not found",
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
