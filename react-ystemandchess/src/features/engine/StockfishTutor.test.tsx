import { getAiFeedbackForMove } from './StockfishTutor';

describe('getAiFeedbackForMove', () => {
  const analysis = { moveIndicator: 'Good' as const, Analysis: 'Local analysis' };
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, feedback: 'AI feedback' }),
    });
    global.fetch = fetchMock as any;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sends the login token as a bearer token to /chat/chess-feedback', async () => {
    const result = await getAiFeedbackForMove(
      analysis, 'fenBefore', 'fenAfter', 'e2e4', 'e2e4', 20, null, 'jwt-token'
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/chat\/chess-feedback$/);
    expect(options.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer jwt-token',
    });
    expect(result.Analysis).toBe('AI feedback');
  });

  it('sends no Authorization header when there is no token', async () => {
    await getAiFeedbackForMove(analysis, 'fenBefore', 'fenAfter', 'e2e4');

    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers).toEqual({ 'Content-Type': 'application/json' });
  });

  it('falls back to the default text when the request is rejected', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    fetchMock.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });

    const result = await getAiFeedbackForMove(analysis, 'fenBefore', 'fenAfter', 'e2e4');

    expect(result.Analysis).not.toBe('AI feedback');
    expect(result.moveIndicator).toBe('Good');
  });
});
