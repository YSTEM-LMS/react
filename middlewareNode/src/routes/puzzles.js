/**
 * Puzzles Routes
 * * API endpoints for retrieving chess puzzles from the database.
 * Puzzles are sourced from Lichess and stored in MongoDB.
 * * Features:
 * - Get all puzzles
 * - Get random selection of puzzles
 * - Filter puzzles by difficulty and themes
 */

const express = require("express");
const router = express.Router();
const puzzles = require("../models/puzzles");

/**
 * GET /puzzles/list
 * * Retrieves all chess puzzles from the database.
 * Returns array of puzzle objects without MongoDB _id field.
 * * @returns {Array} Array of all puzzles
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
 * * Retrieves a random selection of chess puzzles.
 * Useful for providing variety in puzzle practice sessions.
 * * Query Parameters:
 * - limit: Number of random puzzles to return (default: 20)
 * - minRating: Minimum puzzle difficulty (default: 0)
 * - maxRating: Maximum puzzle difficulty (default: 4000)
 * * @returns {Array} Array of randomly selected puzzles
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

module.exports = router;
