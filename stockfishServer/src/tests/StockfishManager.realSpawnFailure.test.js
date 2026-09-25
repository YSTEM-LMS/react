const fs = require("fs");
const StockfishManager = require("../managers/StockfishManager");

// Unlike StockfishManager.test.js, this suite does NOT mock child_process.
// It exercises the real vendored binary with its execute bit temporarily
// stripped, so it covers the exact gap flagged in issue 9: the real binary,
// the real permission bit, and the real 'error' event path were never
// under test.
const testFn = process.platform === "win32" ? test.skip : test;

describe("StockfishManager real spawn failure path", () => {
  const { enginePath } = StockfishManager;
  let originalMode;

  beforeAll(() => {
    originalMode = fs.statSync(enginePath).mode;
  });

  afterEach(() => {
    // Always restore the real, git-tracked binary's permissions, regardless
    // of test outcome, so this suite never leaves the working tree dirty.
    fs.chmodSync(enginePath, originalMode);
  });

  const newSocket = () => ({
    id: `socket-${Math.random()}`,
    emit: jest.fn(),
  });

  testFn(
    "emits session-error instead of crashing when the engine binary is not executable",
    (done) => {
      fs.chmodSync(enginePath, 0o644);

      const stockfishManager = new StockfishManager();
      const socket = newSocket();

      socket.emit.mockImplementation((event, payload) => {
        if (event === "session-error") {
          expect(payload.error).toBe("Chess engine failed to start");
          expect(stockfishManager.sessions.has(socket.id)).toBe(false);
          done();
        }
      });

      expect(() => {
        stockfishManager.registerSession(socket, "lesson");
      }).not.toThrow();
    },
    10000
  );
});
