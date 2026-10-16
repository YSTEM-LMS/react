/**
 * Saving and resuming Play Computer games (saved games, Phase A).
 * The core game behaviour is covered in PlayComputer.test.tsx; this file
 * only covers what changes for a logged-in player.
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { io } from 'socket.io-client';
import * as ReactRouter from 'react-router';
import PlayComputer, { SAVE_DEBOUNCE_MS } from './PlayComputer';
import { createSavedGame, getSavedGame, updateSavedGame } from '../../core/services/savedGamesApi';

jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useLocation: jest.fn(),
}));

jest.mock('socket.io-client');

let mockCookies: Record<string, string> = {};
jest.mock('react-cookie', () => ({
  useCookies: () => [mockCookies],
}));

jest.mock('../../core/services/savedGamesApi');

// The tutor isn't under test and makes its own network calls.
jest.mock('./StockfishTutor', () => () => null);

jest.mock('../../components/ChessBoard/ChessBoard', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: React.forwardRef((props: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({
        setPosition: jest.fn(),
        highlightMove: jest.fn(),
        reset: jest.fn(),
        flip: jest.fn(),
      }));
      return (
        <div data-testid="chessboard" data-orientation={props.orientation} data-fen={props.fen}>
          <button data-testid="move-e2e4" onClick={() => props.onMove({ from: 'e2', to: 'e4' })}>e4</button>
        </div>
      );
    }),
  };
});

jest.mock('../../environments', () => ({
  environment: { urls: { stockfishServerURL: 'http://localhost:8080' } },
}));

const savedGame = (overrides = {}) => ({
  uuid: 'game-1',
  gameType: 'computer',
  gameName: 'Me vs Computer',
  playerColor: 'white',
  computerLevel: 10,
  startFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  pgn: '',
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  plyCount: 0,
  status: 'ongoing',
  endReason: null,
  notes: [],
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  ...overrides,
});

describe('PlayComputer saving', () => {
  let handlers: Record<string, (...args: any[]) => void>;
  let mockEmit: jest.Mock;

  const fire = (event: string, payload?: any) => act(() => { handlers[event](payload); });

  const renderPage = (state: any = null) => {
    (ReactRouter.useLocation as jest.Mock).mockReturnValue({ key: 'k1', state });
    return render(
      <MemoryRouter>
        <PlayComputer />
      </MemoryRouter>
    );
  };

  const startGame = async () => {
    fire('connect');
    fireEvent.click(screen.getByText('Start Game'));
    fire('session-started', { success: true });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    handlers = {};
    mockEmit = jest.fn();
    (io as jest.Mock).mockReturnValue({
      on: (event: string, cb: any) => { handlers[event] = cb; },
      emit: mockEmit,
      disconnect: jest.fn(),
    });
    mockCookies = { login: 'tok' };
    (createSavedGame as jest.Mock).mockResolvedValue(savedGame());
    (updateSavedGame as jest.Mock).mockResolvedValue(savedGame());
  });

  test('starting a game creates a saved game with the chosen settings', async () => {
    renderPage();
    fireEvent.click(screen.getByText('Black'));
    fireEvent.click(screen.getByText('Expert'));
    await startGame();

    await waitFor(() => expect(screen.getByTestId('save-status')).toHaveTextContent('Game saved'));
    expect(createSavedGame).toHaveBeenCalledWith('tok', { playerColor: 'black', computerLevel: 15 });
  });

  test('moves are saved once, after the debounce, with both sides in the PGN', async () => {
    renderPage();
    await startGame();
    await waitFor(() => expect(createSavedGame).toHaveBeenCalled());
    await act(async () => {});

    fireEvent.click(screen.getByTestId('move-e2e4'));
    fire('evaluation-complete', { mode: 'move', move: 'e7e5' });

    expect(updateSavedGame).not.toHaveBeenCalled();
    await waitFor(() => expect(updateSavedGame).toHaveBeenCalledTimes(1), {
      timeout: SAVE_DEBOUNCE_MS + 1500,
    });
    const [token, uuid, changes] = (updateSavedGame as jest.Mock).mock.calls[0];
    expect(token).toBe('tok');
    expect(uuid).toBe('game-1');
    expect(changes.pgn).toMatch(/1\. e4 e5/);
    expect(changes).not.toHaveProperty('resign');
  });

  test('resigning saves the moves with resign: true', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    renderPage();
    await startGame();
    await waitFor(() => expect(createSavedGame).toHaveBeenCalled());
    await act(async () => {});
    fireEvent.click(screen.getByTestId('move-e2e4'));

    fireEvent.click(screen.getByText('Resign'));

    await waitFor(() => expect(updateSavedGame).toHaveBeenCalled());
    const changes = (updateSavedGame as jest.Mock).mock.calls[0][2];
    expect(changes).toMatchObject({ resign: true });
    expect(changes.pgn).toMatch(/1\. e4/);
    expect(screen.getAllByText('You resigned. The computer wins!').length).toBeGreaterThan(0);
  });

  test('a failed save is shown to the player', async () => {
    (updateSavedGame as jest.Mock).mockRejectedValue(new Error('This game is finished.'));
    renderPage();
    await startGame();
    await waitFor(() => expect(createSavedGame).toHaveBeenCalled());
    await act(async () => {});

    fireEvent.click(screen.getByTestId('move-e2e4'));

    await waitFor(
      () => expect(screen.getByTestId('save-status')).toHaveTextContent('Not saved: This game is finished.'),
      { timeout: SAVE_DEBOUNCE_MS + 1500 }
    );
  });

  test('a guest plays without saving', async () => {
    mockCookies = {};
    renderPage();
    await startGame();
    fireEvent.click(screen.getByTestId('move-e2e4'));
    await new Promise((r) => setTimeout(r, SAVE_DEBOUNCE_MS + 200));

    expect(createSavedGame).not.toHaveBeenCalled();
    expect(updateSavedGame).not.toHaveBeenCalled();
    expect(screen.getByTestId('save-status')).toHaveTextContent('Log in to save your games');
  });

  test('resume loads the saved game and lets the computer move when it is its turn', async () => {
    (getSavedGame as jest.Mock).mockResolvedValue(
      savedGame({
        playerColor: 'black',
        computerLevel: 15,
        pgn: '1. e4 e5 *',
        plyCount: 2,
        fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
      })
    );
    renderPage({ resumeUuid: 'game-1' });
    fire('connect');

    await waitFor(() =>
      expect(mockEmit).toHaveBeenCalledWith('start-session', {
        sessionType: 'player-vs-computer',
        fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
      })
    );
    expect(getSavedGame).toHaveBeenCalledWith('tok', 'game-1');
    expect(createSavedGame).not.toHaveBeenCalled();
    expect(screen.queryByText('Game Settings')).not.toBeInTheDocument();
    expect(screen.getByTestId('chessboard')).toHaveAttribute('data-orientation', 'black');

    // White (the computer) is to move, so it is asked for a move at the saved level.
    fire('session-started', { success: true });
    expect(mockEmit).toHaveBeenCalledWith('evaluate-fen', expect.objectContaining({ level: 15 }));
  });

  test("a finished game can't be resumed", async () => {
    (getSavedGame as jest.Mock).mockResolvedValue(savedGame({ status: 'won', endReason: 'checkmate' }));
    renderPage({ resumeUuid: 'game-1' });
    fire('connect');

    expect(await screen.findByText(/That game is finished/)).toBeInTheDocument();
    expect(screen.getByText('Game Settings')).toBeInTheDocument();
    expect(mockEmit).not.toHaveBeenCalledWith('start-session', expect.anything());
  });

  test('the settings screen links to saved games for a logged-in player', () => {
    renderPage();
    expect(screen.getByRole('link', { name: /Your saved games/ })).toHaveAttribute('href', '/select-game');
  });
});
