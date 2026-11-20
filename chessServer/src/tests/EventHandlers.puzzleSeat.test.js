/**
 * Unit test — the "setstateColor" handler's error path for a rejected
 * mentor request (see GameManager.setBoardColor's isPuzzle seat check).
 *
 * Confirms the existing try/catch around the handler (EventHandlers.js)
 * does its job once setBoardColor can throw for this seat: the rejection
 * is caught, reported only to the sender via socket.emit("error", ...)
 * (never broadcast to the room), and the handler itself never throws out
 * to the caller — same pattern already used for "move"/"undo".
 *
 * global.fetch is mocked for createOrJoinPuzzle's identity checks; sockets
 * are plain objects with a jest.fn() emit and an on() that records
 * handlers, driven directly — same style as EventHandlers.pvp.test.js.
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
  sockets: { sockets: { get: () => undefined } },
};

beforeEach(() => {
  process.env.MIDDLEWARE_URL = "http://middleware.test";
  global.fetch = jest.fn((url) => {
    if (url.includes("/user/getMentorship")) {
      return Promise.resolve({ status: 200, json: async () => ({ username: "alice" }) });
    }
    if (url.includes("/user/me")) {
      return Promise.resolve({ status: 200, json: async () => ({ username: "alice" }) });
    }
    return Promise.resolve({ status: 404, json: async () => ({}) });
  });
});

afterEach(() => {
  jest.resetAllMocks();
  delete process.env.MIDDLEWARE_URL;
});

describe("setstateColor — mentor seat rejection is caught, not thrown", () => {
  test("a mentor's setstateColor emits an error to the sender only and does not throw", async () => {
    const studentSocket = fakeSocket("sStudent");
    registerSocketHandlers(studentSocket, fakeIo);
    await studentSocket._handlers["newPuzzle"](
      JSON.stringify({ student: "alice", mentor: "bob", role: "student", credentials: "tok-alice" }),
    );

    const mentorSocket = fakeSocket("sMentor");
    registerSocketHandlers(mentorSocket, fakeIo);
    await mentorSocket._handlers["newPuzzle"](
      JSON.stringify({ student: "alice", mentor: "bob", role: "mentor", credentials: "tok-bob" }),
    );

    // The handler itself must not throw out of the socket.on callback —
    // an uncaught error here would crash the process, not just this request.
    await expect(
      Promise.resolve(
        mentorSocket._handlers["setstateColor"](
          JSON.stringify({ state: "r3k2r/8/8/8/8/8/8/R3K2R w - - 0 1", color: "black", hints: "different puzzle" }),
        ),
      ),
    ).resolves.toBeUndefined();

    expect(mentorSocket.emit).toHaveBeenCalledWith("error", "Only the student may load a new puzzle!");
    // Only the sender's own socket heard about it — nothing was broadcast.
    expect(studentSocket.emit).not.toHaveBeenCalledWith("boardstate", expect.anything());
  });
});
