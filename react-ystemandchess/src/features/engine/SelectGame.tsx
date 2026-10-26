/**
 * Your saved games (Phase A: Play Computer games)
 *
 * Salvaged from PR #197's SelectGame screen and rewired to the new
 * /savedGames API, computer games only: list, resume and delete. Friend and
 * mentor games come back in Phase D, and reviewing a finished game in
 * Phase B, so finished games are listed but can't be resumed.
 *
 * Resume navigates to /play with { resumeUuid }; PlayComputer loads the
 * saved PGN and continues from there.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useCookies } from 'react-cookie';
import { useNavigate } from 'react-router';
import { Link } from 'react-router-dom';
import { deleteSavedGame, listSavedGames } from '../../core/services/savedGamesApi';
import { SavedGameEndReason, SavedGameSummary } from '../../core/types/savedGame';
import { cn } from '../../core/utils/cn';

const LEVEL_NAMES: Record<number, string> = { 1: 'Easy', 5: 'Medium', 10: 'Hard', 15: 'Expert', 20: 'Master' };

const STATUS_LABELS: Record<SavedGameSummary['status'], string> = {
  ongoing: 'In progress',
  won: 'Won',
  lost: 'Lost',
  draw: 'Draw',
};

const STATUS_STYLES: Record<SavedGameSummary['status'], string> = {
  ongoing: 'bg-[#E5F3D2] text-[#5A991E]',
  won: 'bg-[#7FCC26] text-[#1F1F1F]',
  lost: 'bg-[#FFF5F5] text-[#C53030]',
  draw: 'bg-slate-200 text-slate-600',
};

const END_REASON_LABELS: Record<SavedGameEndReason, string> = {
  checkmate: 'checkmate',
  stalemate: 'stalemate',
  insufficient_material: 'insufficient material',
  threefold_repetition: 'repetition',
  fifty_move: '50-move rule',
  resign: 'resigned',
  timeout: 'timeout',
};

function describeGame(game: SavedGameSummary): string {
  const level = game.computerLevel ?? 0;
  const levelName = LEVEL_NAMES[level] ? `${LEVEL_NAMES[level]} (level ${level})` : `level ${level}`;
  const moves = Math.ceil(game.plyCount / 2);
  return `vs Computer, ${levelName} · You played ${game.playerColor} · ${moves} ${moves === 1 ? 'move' : 'moves'}`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString();
}

const SelectGame: React.FC = () => {
  const navigate = useNavigate();
  const [cookies] = useCookies(['login']);
  const token: string | undefined = cookies.login || undefined;

  const [games, setGames] = useState<SavedGameSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadGames = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setGames(await listSavedGames(token));
    } catch (err: any) {
      setError(
        err?.status === 401
          ? 'Your login has expired. Log in again to see your saved games.'
          : "Couldn't load your saved games. Try refreshing."
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadGames(); }, [loadGames]);

  const handleResume = (game: SavedGameSummary) => {
    navigate('/play', { state: { resumeUuid: game.uuid } });
  };

  const handleDelete = async (game: SavedGameSummary) => {
    if (!token) return;
    if (!window.confirm(`Delete "${game.gameName}"? This can't be undone.`)) return;
    setDeleting(game.uuid);
    try {
      await deleteSavedGame(token, game.uuid);
      setGames((prev) => prev.filter((g) => g.uuid !== game.uuid));
    } catch (err: any) {
      setError(err?.message ? `Couldn't delete that game: ${err.message}` : "Couldn't delete that game.");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-100px)] w-full justify-center bg-[#e2f0d9] px-4 py-10 font-sans box-border">
      <div className="w-full max-w-[760px]">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-[28px] font-extrabold text-[#1F1F1F]">Your saved games</h1>
          <button
            className="rounded-2xl border-[3px] border-[#1F1F1F] bg-[#7FCC26] px-6 py-3 text-[16px] font-extrabold text-[#1F1F1F] shadow-[4px_4px_0_#1F1F1F] transition-all duration-150 hover:-translate-y-0.5"
            onClick={() => navigate('/play')}
          >
            New game
          </button>
        </div>

        <div className="w-full rounded-[24px] border-[3px] border-[#1F1F1F] bg-white p-6 shadow-[6px_6px_0_rgba(31,31,31,0.15)]">
          {!token && (
            <p className="text-center text-[15px] font-semibold text-slate-600">
              <Link to="/login" className="font-bold text-[#5A991E] underline">Log in</Link> to save your
              games and pick them up later.
            </p>
          )}

          {token && loading && (
            <p className="text-center text-[15px] font-semibold text-slate-500">Loading your games…</p>
          )}

          {token && !loading && error && (
            <p role="alert" className="text-center text-[15px] font-bold text-[#C53030]">{error}</p>
          )}

          {token && !loading && !error && games.length === 0 && (
            <p className="text-center text-[15px] font-semibold text-slate-600">
              No saved games yet. Start a game against the computer and it&rsquo;ll be saved here as you play.
            </p>
          )}

          {token && !loading && games.length > 0 && (
            <ul className="flex flex-col gap-3">
              {games.map((game) => (
                <li
                  key={game.uuid}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border-2 border-[#1F1F1F] bg-white px-4 py-3"
                >
                  <div className="min-w-0 text-left">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-[16px] font-extrabold text-[#1F1F1F]">{game.gameName}</h2>
                      <span className={cn('rounded-full px-2.5 py-0.5 text-[12px] font-extrabold', STATUS_STYLES[game.status])}>
                        {STATUS_LABELS[game.status]}
                        {game.endReason ? ` · ${END_REASON_LABELS[game.endReason]}` : ''}
                      </span>
                    </div>
                    <p className="mt-1 text-[13px] font-semibold text-slate-600">{describeGame(game)}</p>
                    <p className="mt-0.5 text-[12px] font-semibold text-slate-400">Last played {formatDate(game.updatedAt)}</p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {game.status === 'ongoing' && (
                      <button
                        className="rounded-xl border-2 border-[#1F1F1F] bg-[#7FCC26] px-4 py-2 text-[14px] font-extrabold text-[#1F1F1F] transition-all duration-150 hover:-translate-y-0.5"
                        onClick={() => handleResume(game)}
                        aria-label={`Resume ${game.gameName}`}
                      >
                        Resume
                      </button>
                    )}
                    <button
                      className="rounded-xl border border-[#FC8181] bg-white px-4 py-2 text-[14px] font-bold text-[#C53030] transition-all duration-150 hover:border-[#C53030] disabled:opacity-40"
                      onClick={() => handleDelete(game)}
                      disabled={deleting === game.uuid}
                      aria-label={`Delete ${game.gameName}`}
                    >
                      {deleting === game.uuid ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default SelectGame;
