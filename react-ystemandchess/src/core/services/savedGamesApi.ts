/**
 * Saved Games API Service
 *
 * Calls middlewareNode's /savedGames routes. Every route requires a login,
 * so each function takes the user's token (the 'login' cookie) and sends it
 * as a Bearer header, the same way getUserBadges does in badgesApi.ts.
 *
 * Errors throw a SavedGamesApiError carrying the HTTP status and the
 * server's message, so callers can tell "not logged in" (401) and "limit
 * reached" (409) apart from a network failure (status 0).
 */

import { environment } from "../../environments";
import { PlayerColor, SavedGame, SavedGameSummary } from "../types/savedGame";

export class SavedGamesApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "SavedGamesApiError";
    this.status = status;
  }
}

async function call<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${environment.urls.middlewareURL}/savedGames${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
      },
    });
  } catch (err) {
    throw new SavedGamesApiError(0, "Couldn't reach the server");
  }

  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new SavedGamesApiError(res.status, body?.error || `Request failed (${res.status})`);
  }
  return body as T;
}

/** The logged-in user's games, newest first. */
export async function listSavedGames(token: string): Promise<SavedGameSummary[]> {
  const { games } = await call<{ games: SavedGameSummary[] }>("", token);
  return games;
}

export async function getSavedGame(token: string, uuid: string): Promise<SavedGame> {
  const { game } = await call<{ game: SavedGame }>(`/${encodeURIComponent(uuid)}`, token);
  return game;
}

export async function createSavedGame(
  token: string,
  settings: { playerColor: PlayerColor; computerLevel: number; gameName?: string }
): Promise<SavedGame> {
  const { game } = await call<{ game: SavedGame }>("", token, {
    method: "POST",
    body: JSON.stringify(settings),
  });
  return game;
}

/**
 * Saves moves, a new name, or a resignation. The server replays the PGN and
 * decides the result itself; only `resign: true` is taken from the browser.
 */
export async function updateSavedGame(
  token: string,
  uuid: string,
  changes: { pgn?: string; gameName?: string; resign?: true }
): Promise<SavedGame> {
  const { game } = await call<{ game: SavedGame }>(`/${encodeURIComponent(uuid)}`, token, {
    method: "PATCH",
    body: JSON.stringify(changes),
  });
  return game;
}

export async function deleteSavedGame(token: string, uuid: string): Promise<void> {
  await call<void>(`/${encodeURIComponent(uuid)}`, token, { method: "DELETE" });
}
