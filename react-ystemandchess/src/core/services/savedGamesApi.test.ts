import {
  createSavedGame,
  deleteSavedGame,
  getSavedGame,
  listSavedGames,
  SavedGamesApiError,
  updateSavedGame,
} from './savedGamesApi';

jest.mock('../../environments', () => ({
  environment: { urls: { middlewareURL: 'http://mw.test' } },
}));

const jsonResponse = (status: number, body: unknown) =>
  Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response);

describe('savedGamesApi', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  test('listSavedGames sends the login token and returns the games', async () => {
    fetchMock.mockReturnValue(jsonResponse(200, { games: [{ uuid: 'a' }] }));

    const games = await listSavedGames('tok');

    expect(games).toEqual([{ uuid: 'a' }]);
    expect(fetchMock).toHaveBeenCalledWith('http://mw.test/savedGames', {
      headers: { Authorization: 'Bearer tok' },
    });
  });

  test('createSavedGame POSTs the settings as JSON', async () => {
    fetchMock.mockReturnValue(jsonResponse(201, { game: { uuid: 'new' } }));

    const game = await createSavedGame('tok', { playerColor: 'black', computerLevel: 5 });

    expect(game).toEqual({ uuid: 'new' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://mw.test/savedGames');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ Authorization: 'Bearer tok', 'Content-Type': 'application/json' });
    expect(JSON.parse(init.body)).toEqual({ playerColor: 'black', computerLevel: 5 });
  });

  test('updateSavedGame PATCHes only the fields given', async () => {
    fetchMock.mockReturnValue(jsonResponse(200, { game: { uuid: 'u1' } }));

    await updateSavedGame('tok', 'u1', { pgn: '1. e4', resign: true });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://mw.test/savedGames/u1');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body)).toEqual({ pgn: '1. e4', resign: true });
  });

  test('getSavedGame and deleteSavedGame use the game id', async () => {
    fetchMock.mockReturnValueOnce(jsonResponse(200, { game: { uuid: 'u1' } }));
    fetchMock.mockReturnValueOnce(Promise.resolve({ ok: true, status: 204 } as Response));

    expect(await getSavedGame('tok', 'u1')).toEqual({ uuid: 'u1' });
    await deleteSavedGame('tok', 'u1');

    expect(fetchMock.mock.calls[1][0]).toBe('http://mw.test/savedGames/u1');
    expect(fetchMock.mock.calls[1][1].method).toBe('DELETE');
  });

  test("throws the server's message and status on an error response", async () => {
    fetchMock.mockReturnValue(jsonResponse(409, { error: 'You can save up to 100 games.' }));

    const err = await createSavedGame('tok', { playerColor: 'white', computerLevel: 10 }).catch((e) => e);

    expect(err).toBeInstanceOf(SavedGamesApiError);
    expect(err.status).toBe(409);
    expect(err.message).toBe('You can save up to 100 games.');
  });

  test('reports a network failure as status 0', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const err = await listSavedGames('tok').catch((e) => e);

    expect(err).toBeInstanceOf(SavedGamesApiError);
    expect(err.status).toBe(0);
  });
});
