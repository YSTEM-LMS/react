jest.mock("child_process", () => ({
  spawn: jest.fn(() => ({
    stdin: { write: jest.fn() },
    stdout: { on: jest.fn() },
    on: jest.fn(),
    kill: jest.fn(),
  })),
}));

const StockfishManager = require("../managers/StockfishManager");
const { spawn } = require("child_process");

const newSocket = () => ({
  id: `socket-${Math.random()}`,
  emit: jest.fn(),
});

describe("StockfishManager", () => {
  let stockfishManager, socket;

  beforeEach(() => {
    stockfishManager = new StockfishManager();
    socket = newSocket();
  });

  test("registers a new session", () => {
    stockfishManager.registerSession(socket, "lesson");

    const session = stockfishManager.sessions.get(socket.id);
    expect(session).toBeDefined();
    expect(session.sessionType).toBe("lesson");
    expect(session.stockfishEngine).toBeDefined();
  });

  test("throws error on duplicate session registration", () => {
    stockfishManager.registerSession(socket, "lesson");

    expect(() => {
      stockfishManager.registerSession(socket, "lesson");
    }).toThrow("Session already exists!");
  });

  test("updates FEN for a valid session", () => {
    stockfishManager.registerSession(socket, "lesson");

    const newFen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
    stockfishManager.updateFen(socket.id, newFen);

    const session = stockfishManager.sessions.get(socket.id);
    expect(session.gameFen).toBe(newFen);
  });

  test("throws error on invalid FEN", () => {
    stockfishManager.registerSession(socket, "mentorship");

    expect(() => {
      stockfishManager.updateFen(socket.id, "");
    }).toThrow("Invalid FEN");
  });

  test("sends evaluation command to stockfish", () => {
    const fakeWrite = jest.fn();

    spawn.mockReturnValue({
      stdin: { write: fakeWrite },
      stdout: { on: jest.fn() },
      on: jest.fn(),
      kill: jest.fn(),
    });

    stockfishManager.registerSession(socket, "lesson");

    const fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
    stockfishManager.evaluateFen(socket.id, fen, "", 5);

    expect(fakeWrite).toHaveBeenCalledWith(
      expect.stringContaining("position fen")
    );
    expect(fakeWrite).toHaveBeenCalledWith(
      expect.stringContaining("go depth 5\n")
    );
  });

  test("deletes a session and kills stockfish process", () => {
    const mockKill = jest.fn();

    spawn.mockReturnValue({
      stdin: { write: jest.fn() },
      stdout: { on: jest.fn() },
      on: jest.fn(),
      kill: mockKill,
    });

    stockfishManager.registerSession(socket, "lesson");
    stockfishManager.deleteSession(socket.id);

    expect(mockKill).toHaveBeenCalled();
    expect(stockfishManager.sessions.has(socket.id)).toBe(false);
  });

  test("throws error when stockfish engine is not configured", () => {
    stockfishManager.registerSession(socket, "mentorship");
    const session = stockfishManager.sessions.get(socket.id);
    session.stockfishEngine = null;

    expect(() => {
      stockfishManager._configureEngine(socket.id);
    }).toThrow("Stockfish instance not set up for this session");
  });
});
