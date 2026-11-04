/**
 * Game Results Schema
 *
 * One immutable record per finished student-vs-student chess game.
 *
 * This is the single source of truth for competitive-play stats. Nothing
 * stores a running "chess score" on the user document — wins/draws/losses and
 * the derived score are computed on read from these records (see
 * utils/studentStats.getChessRecord), the same way the leaderboard computes
 * every other stat. That keeps the score reproducible: change the weights and
 * every historical game re-scores, with no backfill.
 *
 * `gameId` is unique, which is also the idempotency key: a reconnect, a retry,
 * or both clients reporting the same game can never double-count it.
 *
 * Records are written only by the chessServer at game end (checkmate, resign,
 * or disconnect-forfeit) via POST /internal/gameResults, authenticated with
 * CHESS_SERVICE_KEY rather than a player JWT — see the PvP results plan (v2).
 * `source` records how a record got here: "chessServer" for everything
 * reported through that path, "legacy-unverified" for records that predate
 * it (the old player-facing POST never actually worked — see finding #1 of
 * that plan — so any pre-existing record is suspect, not verified history).
 */

const mongoose = require("mongoose");

const GameResultsSchema = new mongoose.Schema(
  {
    // Idempotency key — the gameId minted by the accepted challenge.
    gameId: { type: String, required: true, unique: true, index: true },

    // Both participants, regardless of outcome. Indexed so a student's whole
    // history is one query; a draw has no winner/loser, so this is the only
    // way to find both sides of one.
    players: {
      type: [String],
      required: true,
      index: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length === 2 && v[0] !== v[1],
        message: "players must be exactly two distinct usernames",
      },
    },

    // "win" => winnerUsername/loserUsername are set. "draw" => both are null.
    result: { type: String, enum: ["win", "draw"], required: true },

    winnerUsername: { type: String, default: null, index: true },
    loserUsername: { type: String, default: null, index: true },

    // How the game ended. "draw" covers stalemate/insufficient material/
    // threefold repetition — the chess reason isn't scored, only recorded.
    reason: {
      type: String,
      enum: ["checkmate", "resign", "disconnect", "draw"],
      required: true,
    },

    playedAt: { type: Date, default: Date.now, index: true },

    // Defaults to "legacy-unverified" rather than being required: any write
    // that doesn't explicitly claim source: "chessServer" (only
    // routes/internalGameResults.js does) should safely fall back to
    // unverified, not fail. This also keeps older code paths that create a
    // GameResults doc without knowing about this field working unchanged.
    source: {
      type: String,
      enum: ["chessServer", "legacy-unverified"],
      default: "legacy-unverified",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("GameResults", GameResultsSchema);
