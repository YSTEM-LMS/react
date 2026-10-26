/**
 * Saved games routes (Phase A: Play Computer games)
 *
 * Mounted at /savedGames behind requireAuth (see server.js), so every route
 * has a logged-in req.user. All game rules live in services/savedGames.js.
 *
 *   GET    /savedGames          the caller's own games, newest first
 *   POST   /savedGames          start saving a new computer game
 *   GET    /savedGames/:uuid    one game (owner, paired mentor, or admin)
 *   PATCH  /savedGames/:uuid    update moves, rename, or resign (owner only)
 *   DELETE /savedGames/:uuid    delete (owner only)
 *
 * A game the caller can't see returns 404, not 403, so ids can't be probed
 * to find out which games exist.
 */

const express = require("express");
const SavedGame = require("../models/savedGame");
const {
  LIMITS,
  SavedGameError,
  normalizeFen,
  replayPgn,
  resultForPlayer,
  isOwner,
  canRead,
  toPublic,
  toSummary,
  DEFAULT_POSITION,
} = require("../services/savedGames");

const router = express.Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NOT_FOUND = { error: "Game not found" };

function validateGameName(name, fallback) {
  if (name === undefined || name === null || name === "") return fallback;
  if (typeof name !== "string" || !name.trim()) {
    throw new SavedGameError(400, "gameName must be a non-empty string");
  }
  if (name.trim().length > 80) {
    throw new SavedGameError(400, "gameName must be 80 characters or fewer");
  }
  return name.trim();
}

function sendError(res, err, context) {
  if (err instanceof SavedGameError) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error(`[savedGames] ${context}:`, err);
  return res.status(500).json({ error: "Server error" });
}

async function findReadable(req) {
  if (!UUID_RE.test(req.params.uuid)) return null;
  const game = await SavedGame.findOne({ uuid: req.params.uuid });
  if (!game || !(await canRead(req.user, game))) return null;
  return game;
}

async function findOwned(req) {
  if (!UUID_RE.test(req.params.uuid)) return null;
  const game = await SavedGame.findOne({ uuid: req.params.uuid });
  if (!game || !isOwner(req.user, game)) return null;
  return game;
}

router.get("/", async (req, res) => {
  try {
    const games = await SavedGame.find({ userId: req.user._id })
      .sort({ updatedAt: -1 })
      .limit(LIMITS.maxGamesPerUser);
    res.json({ games: games.map(toSummary) });
  } catch (err) {
    sendError(res, err, "list");
  }
});

router.post("/", async (req, res) => {
  try {
    const { playerColor, computerLevel, gameName, startFen, pgn } = req.body || {};

    if (!SavedGame.PLAYER_COLORS.includes(playerColor)) {
      throw new SavedGameError(400, "playerColor must be 'white' or 'black'");
    }
    if (!Number.isInteger(computerLevel) || computerLevel < 0 || computerLevel > 20) {
      throw new SavedGameError(400, "computerLevel must be an integer from 0 to 20");
    }
    const name = validateGameName(gameName, "Me vs Computer");
    const start = startFen === undefined ? normalizeFen(DEFAULT_POSITION) : normalizeFen(startFen);

    const count = await SavedGame.countDocuments({ userId: req.user._id });
    if (count >= LIMITS.maxGamesPerUser) {
      throw new SavedGameError(
        409,
        `You can save up to ${LIMITS.maxGamesPerUser} games. Delete one to save another.`
      );
    }

    const replay = replayPgn(pgn, start);
    const game = await SavedGame.create({
      userId: req.user._id,
      gameType: "computer",
      playerColor,
      computerLevel,
      gameName: name,
      startFen: start,
      pgn: replay.pgn,
      fen: replay.fen,
      plyCount: replay.plyCount,
      ...resultForPlayer(replay, playerColor),
    });

    res.status(201).json({ game: toPublic(game) });
  } catch (err) {
    sendError(res, err, "create");
  }
});

router.get("/:uuid", async (req, res) => {
  try {
    const game = await findReadable(req);
    if (!game) return res.status(404).json(NOT_FOUND);
    res.json({ game: toPublic(game) });
  } catch (err) {
    sendError(res, err, "read");
  }
});

router.patch("/:uuid", async (req, res) => {
  try {
    const game = await findOwned(req);
    if (!game) return res.status(404).json(NOT_FOUND);

    const { pgn, gameName, resign } = req.body || {};
    if (pgn === undefined && gameName === undefined && resign === undefined) {
      throw new SavedGameError(400, "Nothing to update. Send pgn, gameName or resign.");
    }
    if (resign !== undefined && resign !== true) {
      throw new SavedGameError(400, "resign can only be true");
    }

    const finished = game.status !== "ongoing";
    if (finished && (pgn !== undefined || resign)) {
      throw new SavedGameError(409, "This game is finished. Only its name can change.");
    }

    if (gameName !== undefined) {
      game.gameName = validateGameName(gameName, game.gameName);
    }

    if (pgn !== undefined) {
      const replay = replayPgn(pgn, game.startFen);
      game.pgn = replay.pgn;
      game.fen = replay.fen;
      game.plyCount = replay.plyCount;
      Object.assign(game, resultForPlayer(replay, game.playerColor));
    }

    // Resigning is the one result the browser may claim. If the moves sent in
    // the same request already ended the game, that result stands.
    if (resign && game.status === "ongoing") {
      game.status = "lost";
      game.endReason = "resign";
    }

    await game.save();
    res.json({ game: toPublic(game) });
  } catch (err) {
    sendError(res, err, "update");
  }
});

router.delete("/:uuid", async (req, res) => {
  try {
    const game = await findOwned(req);
    if (!game) return res.status(404).json(NOT_FOUND);
    await SavedGame.deleteOne({ _id: game._id });
    res.status(204).end();
  } catch (err) {
    sendError(res, err, "delete");
  }
});

module.exports = router;
