/**
 * Unit tests — "newpvpgame" verifies identity against the middleware before
 * seating a player (never trusts the client's own claim), and a finished PvP
 * game reports its result with the chess server's own service key. See the
 * PvP results plan (v2), T4.
 *
 * global.fetch is mocked; everything else (GameManager, the socket handlers)
 * is real. Sockets are plain objects with a jest.fn() emit and an on() that
 * records handlers, driven directly — no real network/socket.io needed for
 * this layer (src/tests/index.test.js already covers the real-socket path).
 */

const registerSocketHandlers = require("../managers/EventHandlers");

function fakeSocket(id) {
  const handlers = {};
  return {
    id,
    on: (event, handler) => {
      handlers[event] = handler;
    },
    emit: jest.fn(),
    _handlers: handlers,
  };
}

const fakeIo = {
  to: () => ({ emit: jest.fn() }),
  // GameManager.broadcastBoardState reaches into io.sockets.sockets.get(id);
  // no real sockets are registered here, so every lookup is a harmless miss.
  sockets: { sockets: { get: () => undefined } },
};

beforeEach(() => {
  process.env.MIDDLEWARE_URL = "http://middleware.test";
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.resetAllMocks();
  delete process.env.MIDDLEWARE_URL;
  delete process.env.CHESS_SERVICE_KEY;
});

describe("newpvpgame — identity is verified against the middleware", () => {
  test("rejects when the client-claimed username does not match the middleware's", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ gameId: "g1", you: "alice", white: "alice", black: "bob", status: "active" }),
    });

    const socket = fakeSocket("s1");
    registerSocketHandlers(socket, fakeIo);

    await socket._handlers["newpvpgame"](
      JSON.stringify({ gameId: "g1", username: "mallory", credentials: "tok" })
    );

    expect(socket.emit).toHaveBeenCalledWith("gameerror", "username does not match your login");
  });

  test("rejects an unaccepted/unknown gameId", async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 404 });

    const socket = fakeSocket("s1");
    registerSocketHandlers(socket, fakeIo);

    await socket._handlers["newpvpgame"](
      JSON.stringify({ gameId: "ghost", username: "alice", credentials: "tok" })
    );

    expect(socket.emit).toHaveBeenCalledWith("gameerror", expect.stringContaining("404"));
  });

  test("seats the verified player using white/black from the middleware response only", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ gameId: "g1", you: "alice", white: "alice", black: "bob", status: "active" }),
    });

    const socket = fakeSocket("s1");
    registerSocketHandlers(socket, fakeIo);

    // The client claims the opposite colors — they must be ignored.
    await socket._handlers["newpvpgame"](
      JSON.stringify({ gameId: "g1", username: "alice", white: "mallory", black: "mallory", credentials: "tok" })
    );

    expect(socket.emit).toHaveBeenCalledWith("boardstate", expect.any(String));
    const [, payload] = socket.emit.mock.calls.find(([event]) => event === "boardstate");
    expect(JSON.parse(payload).color).toBe("white");
  });
});

describe("a finished PvP game reports once, with the chess server's own key", () => {
  test("checkmate reports exactly once to /internal/gameResults with X-Service-Key", async () => {
    process.env.CHESS_SERVICE_KEY = "test-key";

    global.fetch.mockImplementation((url, opts) => {
      if (String(url).endsWith("/challenge/game/g1")) {
        const you = opts.headers.Authorization.replace("Bearer ", "");
        return Promise.resolve({
          ok: true,
          json: async () => ({ gameId: "g1", you, white: "alice", black: "bob", status: "active" }),
        });
      }
      if (String(url).endsWith("/internal/gameResults")) {
        return Promise.resolve({ ok: true, status: 201 });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });

    const alice = fakeSocket("sAlice");
    const bob = fakeSocket("sBob");
    registerSocketHandlers(alice, fakeIo);
    registerSocketHandlers(bob, fakeIo);

    await alice._handlers["newpvpgame"](
      JSON.stringify({ gameId: "g1", username: "alice", credentials: "alice" })
    );
    await bob._handlers["newpvpgame"](
      JSON.stringify({ gameId: "g1", username: "bob", credentials: "bob" })
    );

    // Fool's Mate: 1. f3 e5 2. g4 Qh4# — white (alice) is checkmated.
    await alice._handlers["move"](JSON.stringify({ from: "f2", to: "f3" }));
    await bob._handlers["move"](JSON.stringify({ from: "e7", to: "e5" }));
    await alice._handlers["move"](JSON.stringify({ from: "g2", to: "g4" }));
    await bob._handlers["move"](JSON.stringify({ from: "d8", to: "h4" }));

    const reportCalls = global.fetch.mock.calls.filter(([url]) =>
      String(url).endsWith("/internal/gameResults")
    );
    expect(reportCalls).toHaveLength(1);

    const [url, opts] = reportCalls[0];
    expect(url).toBe("http://middleware.test/internal/gameResults");
    expect(opts.headers["X-Service-Key"]).toBe("test-key");
    const body = JSON.parse(opts.body);
    expect(body).toEqual({
      gameId: "g1",
      result: "win",
      reason: "checkmate",
      winnerUsername: "bob",
      loserUsername: "alice",
    });
  });
});
