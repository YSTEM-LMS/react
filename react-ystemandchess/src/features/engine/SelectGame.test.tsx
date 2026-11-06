import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import SelectGame from './SelectGame';
import { deleteSavedGame, listSavedGames } from '../../core/services/savedGamesApi';

const mockNavigate = jest.fn();
jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useNavigate: () => mockNavigate,
}));

let mockCookies: Record<string, string> = {};
jest.mock('react-cookie', () => ({
  useCookies: () => [mockCookies],
}));

jest.mock('../../core/services/savedGamesApi');

const ongoing = {
  uuid: 'game-1',
  gameType: 'computer',
  gameName: 'Me vs Computer',
  playerColor: 'black',
  computerLevel: 15,
  startFen: 'start',
  fen: 'fen',
  plyCount: 7,
  status: 'ongoing',
  endReason: null,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-02T00:00:00.000Z',
};

const finished = {
  ...ongoing,
  uuid: 'game-2',
  gameName: 'Tough one',
  status: 'lost',
  endReason: 'checkmate',
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <SelectGame />
    </MemoryRouter>
  );

describe('SelectGame', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCookies = { login: 'tok' };
    (listSavedGames as jest.Mock).mockResolvedValue([ongoing, finished]);
  });

  test('lists the saved games with their result and details', async () => {
    renderPage();

    expect(await screen.findByText('Me vs Computer')).toBeInTheDocument();
    expect(listSavedGames).toHaveBeenCalledWith('tok');
    expect(screen.getByText('In progress')).toBeInTheDocument();
    expect(screen.getByText('Lost · checkmate')).toBeInTheDocument();
    expect(screen.getAllByText(/vs Computer, Expert \(level 15\) · You played black · 4 moves/)).toHaveLength(2);
  });

  test('only games in progress can be resumed', async () => {
    renderPage();
    await screen.findByText('Me vs Computer');

    expect(screen.getByRole('button', { name: 'Resume Me vs Computer' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Resume Tough one' })).not.toBeInTheDocument();
  });

  test('resume opens Play Computer with the game id', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Resume Me vs Computer' }));

    expect(mockNavigate).toHaveBeenCalledWith('/play', { state: { resumeUuid: 'game-1' } });
  });

  test('delete removes the game after confirming', async () => {
    (deleteSavedGame as jest.Mock).mockResolvedValue(undefined);
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Delete Tough one' }));

    await waitFor(() => expect(screen.queryByText('Tough one')).not.toBeInTheDocument());
    expect(deleteSavedGame).toHaveBeenCalledWith('tok', 'game-2');
    expect(screen.getByText('Me vs Computer')).toBeInTheDocument();
  });

  test('cancelling the confirmation keeps the game', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(false);
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Delete Tough one' }));

    expect(deleteSavedGame).not.toHaveBeenCalled();
    expect(screen.getByText('Tough one')).toBeInTheDocument();
  });

  test('shows an empty state when there are no saved games', async () => {
    (listSavedGames as jest.Mock).mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText(/No saved games yet/)).toBeInTheDocument();
  });

  test('shows an error when the games fail to load', async () => {
    (listSavedGames as jest.Mock).mockRejectedValue(Object.assign(new Error('boom'), { status: 500 }));
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load your saved games");
  });

  test('asks a logged-out visitor to log in, without calling the API', () => {
    mockCookies = {};
    renderPage();

    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login');
    expect(listSavedGames).not.toHaveBeenCalled();
  });

  test('New game goes to Play Computer', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'New game' }));
    expect(mockNavigate).toHaveBeenCalledWith('/play');
  });
});
