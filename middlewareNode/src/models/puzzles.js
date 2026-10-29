const mongoose = require("mongoose");
const { model } = mongoose;

/**
 * Puzzles Schema
 *
 * Defines the MongoDB structure for chess puzzles from the Lichess puzzle
 * database (https://database.lichess.org/#puzzles). A puzzle is a position
 * (FEN) where the side to move is the "computer": the app auto-plays the first
 * solution move, then the player must find the remaining moves.
 *
 * Field names are capitalized to match the Lichess CSV headers and what the
 * React puzzle components read directly (FEN / Moves / Rating / Themes). This
 * schema, the /puzzles routes, and the seed fixture all use the same casing.
 * See src/data/puzzles.seed.json + src/scripts/seedPuzzles.js.
 */
const puzzleSchema = new mongoose.Schema(
  {
    // Lichess puzzle id (e.g. "00008"); unique per puzzle.
    PuzzleId: { type: String, required: true, unique: true },
    // Position where it is the computer's move.
    FEN: { type: String, required: true },
    // Space-separated UCI solution moves; moves[0] is the computer's move.
    Moves: { type: String, required: true },
    // Difficulty rating (~400-3000).
    Rating: { type: Number },
    RatingDeviation: { type: Number },
    Popularity: { type: Number },
    NbPlays: { type: Number },
    // Space-separated tactical/phase tags (e.g. "fork endgame long").
    Themes: { type: String },
    GameUrl: { type: String },
    OpeningTags: { type: String },
  },
  { versionKey: false },
);

module.exports = model("puzzles", puzzleSchema);
