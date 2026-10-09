/**
 * Saved Game Schema
 *
 * One record per saved chess game, owned by the student who played it.
 * Phase A of the saved-games plan stores Play Computer games only
 * (gameType "computer"); mentor and PvP games are added in Phase D through
 * the same service, so the enum already reserves those values.
 *
 * `pgn` is the source of truth. Everything else about the position
 * (`fen`, `plyCount`, `status`, `endReason`) is derived from it on the
 * server by replaying it with chess.js (see services/savedGames.js), never
 * taken from the request body. The browser may only claim a resignation.
 *
 * `userId` always comes from the authenticated user, never from the request
 * body, so a student can't create or move games under someone else's name.
 */

const mongoose = require("mongoose");
const crypto = require("crypto");

const GAME_TYPES = ["computer", "mentor", "pvp"];
const PLAYER_COLORS = ["white", "black"];
const STATUSES = ["ongoing", "won", "lost", "draw"];
const END_REASONS = [
  "checkmate",
  "stalemate",
  "insufficient_material",
  "threefold_repetition",
  "fifty_move",
  "resign",
  "timeout",
];

// Phase B: a mentor's note on one move. Defined now so the model matches the
// plan's data model and Phase B doesn't need a migration.
const NoteSchema = new mongoose.Schema(
  {
    // Ply index the note is attached to (0 = first move of the game).
    ply: { type: Number, required: true, min: 0 },
    authorUsername: { type: String, required: true },
    text: { type: String, required: true, maxlength: 1000 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const SavedGameSchema = new mongoose.Schema(
  {
    // Public id used in URLs. The Mongo _id is never exposed.
    uuid: {
      type: String,
      default: () => crypto.randomUUID(),
      unique: true,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    gameType: { type: String, enum: GAME_TYPES, required: true },
    playerColor: { type: String, enum: PLAYER_COLORS, required: true },
    // Stockfish skill level; only meaningful for gameType "computer".
    computerLevel: { type: Number, min: 0, max: 20, default: null },
    gameName: { type: String, trim: true, maxlength: 80, required: true },

    startFen: { type: String, required: true },
    pgn: { type: String, default: "" },
    fen: { type: String, required: true },
    plyCount: { type: Number, default: 0, min: 0 },

    status: { type: String, enum: STATUSES, default: "ongoing" },
    endReason: { type: String, enum: [...END_REASONS, null], default: null },

    notes: { type: [NoteSchema], default: [] },
  },
  { timestamps: true }
);

// A student's games, newest first: the only list query Phase A makes.
SavedGameSchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model("SavedGame", SavedGameSchema);
module.exports.GAME_TYPES = GAME_TYPES;
module.exports.PLAYER_COLORS = PLAYER_COLORS;
module.exports.STATUSES = STATUSES;
module.exports.END_REASONS = END_REASONS;
