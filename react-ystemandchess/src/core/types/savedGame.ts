/**
 * Saved game as returned by middlewareNode's /savedGames routes.
 *
 * Replaces #197's GameMetaData: games are stored as PGN (the source of truth
 * for resume and review), and everything about the position (fen, plyCount,
 * status, endReason) is derived by the server, never sent by the browser.
 */

export type SavedGameStatus = "ongoing" | "won" | "lost" | "draw";

export type SavedGameEndReason =
  | "checkmate"
  | "stalemate"
  | "insufficient_material"
  | "threefold_repetition"
  | "fifty_move"
  | "resign"
  | "timeout";

export type PlayerColor = "white" | "black";

export type SavedGameNote = {
  ply: number;
  authorUsername: string;
  text: string;
  createdAt: string;
};

/** One game in the list view. Leaves out the move history and notes. */
export type SavedGameSummary = {
  uuid: string;
  gameType: "computer" | "mentor" | "pvp";
  gameName: string;
  playerColor: PlayerColor;
  computerLevel: number | null;
  startFen: string;
  fen: string;
  plyCount: number;
  status: SavedGameStatus;
  endReason: SavedGameEndReason | null;
  createdAt: string;
  updatedAt: string;
};

export type SavedGame = SavedGameSummary & {
  pgn: string;
  notes: SavedGameNote[];
};
