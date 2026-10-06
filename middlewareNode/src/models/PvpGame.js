/**
 * PvpGame Schema
 *
 * Created the moment a challenge is accepted. It is the middleware's record of
 * who the two real players in a gameId are, so the chess server can verify a
 * joining socket against it instead of trusting whatever username the client
 * sends. See documentation/student-vs-student-design.md §10 and the
 * "PvP game results: server-authoritative reporting" plan (v2), target design.
 *
 * `gameId` is the same id the challenge flow (routes/challenge.js) hands out
 * when the challenge is created — unique here too, so an accept can only ever
 * produce one PvpGame per game.
 */

const mongoose = require("mongoose");

const PvpGameSchema = new mongoose.Schema(
  {
    gameId: { type: String, required: true, unique: true, index: true },

    // The challenger is always seated white, the opponent black — matches the
    // chess server's GameManager.createOrJoinPvpGame convention.
    white: { type: String, required: true },
    black: { type: String, required: true },

    // "active" while the game is being played; "finished" once a result has
    // been accepted for it. Internal results can only flip active -> finished.
    status: { type: String, enum: ["active", "finished"], default: "active", index: true },

    acceptedAt: { type: Date, default: Date.now },
    finishedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PvpGame", PvpGameSchema);
