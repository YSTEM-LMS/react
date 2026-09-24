const GameManager = require('../managers/GameManager');

describe('GameManager', () => {
  let gameManager;

  beforeEach(() => {
    gameManager = new GameManager();
  });

  test('creates a new game correctly', () => {
    const result = gameManager.createOrJoinGame({
      student: 'Alice',
      mentor: 'Bob',
      role: 'student',
      socketId: 'socket1'
    });

    expect(result.newGame).toBe(true);
    expect(result.game.student.username).toBe('Alice');
    expect(result.color).toBe('black');
  });

  test('joins an existing game correctly', () => {
    gameManager.createOrJoinGame({
      student: 'Alice',
      mentor: 'Bob',
      role: 'student',
      socketId: 'socket1'
    });

    const result = gameManager.createOrJoinGame({
      student: 'Alice',
      mentor: 'Bob',
      role: 'mentor',
      socketId: 'socket2'
    });

    expect(result.newGame).toBe(false);
    expect(result.color).toBe('white');
  });

  test('makes a valid move', () => {
    const { game } = gameManager.createOrJoinGame({
      student: 'Alice',
      mentor: 'Bob',
      role: 'student',
      socketId: 'socket1'
    });

    game.mentor.id = 'socket2';
    const moveResult = gameManager.makeMove('socket1', 'e2', 'e4');

    expect(moveResult.result.move.from).toBe('e2');
    expect(moveResult.result.move.to).toBe('e4');
  });

  test('throws error for invalid move', () => {
    gameManager.createOrJoinGame({
      student: 'Alice',
      mentor: 'Bob',
      role: 'student',
      socketId: 'socket1'
    });

    expect(() => {
      gameManager.makeMove('socket1', 'e2', 'e9');
    }).toThrow(/Invalid move/);
  });

  test('undoes a move', () => {
    gameManager.createOrJoinGame({
      student: 'Alice',
      mentor: 'Bob',
      role: 'student',
      socketId: 'socket1'
    });

    gameManager.makeMove('socket1', 'e2', 'e4');
    const undoResult = gameManager.undoMove('socket1');

    expect(undoResult.undoneMove.to).toBe('e4');
  });

  // --- Game-over detection (§6) ------------------------------------------

  // Sets up a mentor(white)-vs-student(black) game with both sockets seated
  // and plays Fool's Mate: 1. f3 e5 2. g4 Qh4#. Black (the student) wins.
  const playFoolsMate = () => {
    const { game } = gameManager.createOrJoinGame({
      student: 'Alice', mentor: 'Bob', role: 'student', socketId: 'sBlack'
    });
    game.mentor.id = 'sWhite';
    gameManager.makeMove('sWhite', 'f2', 'f3'); // white
    gameManager.makeMove('sBlack', 'e7', 'e5'); // black
    gameManager.makeMove('sWhite', 'g2', 'g4'); // white
    return gameManager.makeMove('sBlack', 'd8', 'h4'); // black Qh4#
  };

  test('detects checkmate and resolves the winner by color', () => {
    const { result } = playFoolsMate();
    expect(result.outcome.over).toBe(true);
    expect(result.outcome.reason).toBe('checkmate');
    expect(result.outcome.winnerUsername).toBe('Alice'); // black, who mated
    expect(result.outcome.loserUsername).toBe('Bob');    // white, mated
  });

  test('reports no outcome for an ordinary move', () => {
    gameManager.createOrJoinGame({
      student: 'Alice', mentor: 'Bob', role: 'student', socketId: 'socket1'
    });
    const { result } = gameManager.makeMove('socket1', 'e2', 'e4');
    expect(result.outcome.over).toBe(false);
  });

  test('detects a draw by insufficient material after a capture', () => {
    gameManager.createOrJoinGame({
      student: 'Alice', mentor: 'Bob', role: 'student', socketId: 'socket1'
    });
    // White king g6 next to a lone black queen g5; capturing leaves K vs K.
    gameManager.setBoardState('socket1', '7k/8/6K1/6q1/8/8/8/8 w - - 0 1');
    const { result } = gameManager.makeMove('socket1', 'g6', 'g5');
    expect(result.outcome.over).toBe(true);
    expect(result.outcome.reason).toBe('draw');
    expect(result.outcome.winnerUsername).toBeUndefined();
  });

  // --- Resignation & forfeit (§6) ----------------------------------------

  test('resignation makes the resigning player lose', () => {
    const { game } = gameManager.createOrJoinGame({
      student: 'Alice', mentor: 'Bob', role: 'student', socketId: 'sBlack'
    });
    game.mentor.id = 'sWhite';
    const res = gameManager.resign('sBlack', 'resign'); // Alice resigns
    expect(res.outcome.over).toBe(true);
    expect(res.outcome.reason).toBe('resign');
    expect(res.outcome.winnerUsername).toBe('Bob');
    expect(res.outcome.loserUsername).toBe('Alice');
  });

  test('resign returns null when the socket has no game', () => {
    expect(gameManager.resign('ghost')).toBeNull();
  });

  // --- Student-vs-student (PvP) join by gameId (§5) -----------------------

  test('creates a PvP game and seats the challenger as white', () => {
    const res = gameManager.createOrJoinPvpGame({
      gameId: 'g1', challenger: 'Alice', opponent: 'Cara',
      username: 'Alice', socketId: 'sA'
    });
    expect(res.newGame).toBe(true);
    expect(res.color).toBe('white');
    expect(res.game.isPvp).toBe(true);
    expect(gameManager.getGameByGameId('g1')).toBe(res.game);
  });

  test('each PvP seat keeps its own credentials for the end-of-game report', () => {
    // Resign and disconnect carry no payload, so the token has to be captured
    // at join time or the result can never be reported to the middleware.
    gameManager.createOrJoinPvpGame({
      gameId: 'g1', challenger: 'Alice', opponent: 'Cara',
      username: 'Alice', socketId: 'sA', credentials: 'token-alice'
    });
    const res = gameManager.createOrJoinPvpGame({
      gameId: 'g1', challenger: 'Alice', opponent: 'Cara',
      username: 'Cara', socketId: 'sC', credentials: 'token-cara'
    });

    const seats = Object.fromEntries(res.game.players.map((p) => [p.username, p.credentials]));
    expect(seats).toEqual({ Alice: 'token-alice', Cara: 'token-cara' });
  });

  test('reconnecting refreshes the seat credentials rather than blanking them', () => {
    gameManager.createOrJoinPvpGame({
      gameId: 'g1', challenger: 'Alice', opponent: 'Cara',
      username: 'Alice', socketId: 'sA', credentials: 'token-alice'
    });
    // Reconnect with no token supplied — keep the one we already had.
    const res = gameManager.createOrJoinPvpGame({
      gameId: 'g1', challenger: 'Alice', opponent: 'Cara',
      username: 'Alice', socketId: 'sA2'
    });
    const alice = res.game.players.find((p) => p.username === 'Alice');
    expect(alice.id).toBe('sA2');
    expect(alice.credentials).toBe('token-alice');
  });

  test('second PvP player joins the same game by gameId as black', () => {
    gameManager.createOrJoinPvpGame({
      gameId: 'g1', challenger: 'Alice', opponent: 'Cara',
      username: 'Alice', socketId: 'sA'
    });
    const res = gameManager.createOrJoinPvpGame({
      gameId: 'g1', challenger: 'Alice', opponent: 'Cara',
      username: 'Cara', socketId: 'sC'
    });
    expect(res.newGame).toBe(false);
    expect(res.color).toBe('black');
    expect(gameManager.ongoingGames.length).toBe(1);
  });

  test('rejects a non-player trying to join a PvP game', () => {
    expect(() => gameManager.createOrJoinPvpGame({
      gameId: 'g1', challenger: 'Alice', opponent: 'Cara',
      username: 'Mallory', socketId: 'sM'
    })).toThrow(/not a player/);
  });

  test('a decided game cannot be resigned again (no double-award)', () => {
    const { result } = playFoolsMate(); // checkmate latches the game as over
    expect(result.outcome.over).toBe(true);
    // A follow-up resign/disconnect on the same game must be a no-op.
    expect(gameManager.resign('sWhite', 'disconnect')).toBeNull();
    expect(gameManager.resign('sBlack', 'resign')).toBeNull();
  });

  test('a forfeit in a PvP game awards the win to the opponent', () => {
    gameManager.createOrJoinPvpGame({
      gameId: 'g1', challenger: 'Alice', opponent: 'Cara',
      username: 'Alice', socketId: 'sA'
    });
    gameManager.createOrJoinPvpGame({
      gameId: 'g1', challenger: 'Alice', opponent: 'Cara',
      username: 'Cara', socketId: 'sC'
    });
    const res = gameManager.resign('sC', 'disconnect'); // Cara drops
    expect(res.outcome.winnerUsername).toBe('Alice');
    expect(res.outcome.reason).toBe('disconnect');
  });

  // --- Puzzle rooms: student solves, mentor observes (Socratic) ----------

  describe('puzzle rooms (Socratic mode)', () => {
    // Minimal io stub that records every event emitted to each socket.
    const makeIo = () => {
      const emitted = {};
      const sockets = new Map();
      const addSocket = (id) => {
        emitted[id] = [];
        sockets.set(id, { id, emit: (event, data) => emitted[id].push({ event, data }) });
      };
      const io = { sockets: { sockets }, to: () => ({ emit: () => {} }) };
      return { io, emitted, addSocket };
    };
    const eventsFor = (emitted, id) => emitted[id].map((e) => e.event);

    // Mocks the GET /user/getMentorship call a mentor join makes before being
    // seated. A student join never calls this.
    const mockGetMentorship = (status, body) => {
      global.fetch = jest.fn().mockResolvedValue({
        status,
        json: async () => body,
      });
    };

    beforeEach(() => {
      process.env.MIDDLEWARE_URL = 'http://localhost:9999';
      global.fetch = jest.fn();
    });

    afterEach(() => {
      delete process.env.MIDDLEWARE_URL;
      jest.restoreAllMocks();
    });

    test('the connecting student becomes the host (solver)', async () => {
      const { io, emitted, addSocket } = makeIo();
      addSocket('sStudent');
      await gameManager.createOrJoinPuzzle(
        { student: 'Alice', mentor: 'Bob', role: 'student', socketId: 'sStudent' }, io
      );
      expect(eventsFor(emitted, 'sStudent')).toContain('host');
      expect(global.fetch).not.toHaveBeenCalled(); // student joins never call middlewareNode
    });

    test('a student with no token still joins (covers Puzzle Streak, which has no real login)', async () => {
      const { io, emitted, addSocket } = makeIo();
      addSocket('sStudent');
      await gameManager.createOrJoinPuzzle(
        { student: 'Alice', mentor: 'puzzle_mentor_Alice', role: 'student', socketId: 'sStudent' }, io
      );
      expect(eventsFor(emitted, 'sStudent')).toContain('host');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('a correctly paired mentor becomes a guest (observer) and gets the board', async () => {
      mockGetMentorship(200, { username: 'Alice', firstName: 'Bob', lastName: 'Smith' });
      const { io, emitted, addSocket } = makeIo();
      addSocket('sMentor');
      await gameManager.createOrJoinPuzzle(
        { student: 'Alice', mentor: 'Bob', role: 'mentor', socketId: 'sMentor', credentials: 'token-bob' }, io
      );
      const events = eventsFor(emitted, 'sMentor');
      expect(events).toContain('guest');
      expect(events).toContain('boardstate'); // mentor sees the current position immediately
      expect(events).not.toContain('host');
    });

    test('sends the token via the Authorization header (not Authentication)', async () => {
      // GET /user/getMentorship is behind passport-jwt's fromAuthHeaderAsBearerToken(),
      // which only reads the standard "Authorization" header — unlike /gameResults'
      // "Authentication" header, which that route's own auth doesn't actually read
      // either. Using the wrong header here would make every mentor join silently
      // fail even with a valid token, so this is pinned down explicitly.
      mockGetMentorship(200, { username: 'Alice' });
      const { io, addSocket } = makeIo();
      addSocket('sMentor');
      await gameManager.createOrJoinPuzzle(
        { student: 'Alice', mentor: 'Bob', role: 'mentor', socketId: 'sMentor', credentials: 'token-bob' }, io
      );

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/user/getMentorship'),
        expect.objectContaining({
          headers: { Authorization: 'Bearer token-bob' },
        })
      );
      const sentHeaders = global.fetch.mock.calls[0][1].headers;
      expect(sentHeaders).not.toHaveProperty('Authentication');
    });

    test('rejects a mentor join with no token', async () => {
      const { io, addSocket } = makeIo();
      addSocket('sMentor');
      await expect(
        gameManager.createOrJoinPuzzle(
          { student: 'Alice', mentor: 'Bob', role: 'mentor', socketId: 'sMentor' }, io
        )
      ).rejects.toThrow(/login token is required/);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('rejects a mentor join with a token middlewareNode refuses (bad/fake token)', async () => {
      mockGetMentorship(401, { message: 'Unauthorized' });
      const { io, addSocket } = makeIo();
      addSocket('sMentor');
      await expect(
        gameManager.createOrJoinPuzzle(
          { student: 'Alice', mentor: 'Bob', role: 'mentor', socketId: 'sMentor', credentials: 'fake-token' }, io
        )
      ).rejects.toThrow(/Could not verify mentor pairing/);
    });

    test('rejects a mentor join when MIDDLEWARE_URL is unset', async () => {
      delete process.env.MIDDLEWARE_URL;
      const { io, addSocket } = makeIo();
      addSocket('sMentor');
      await expect(
        gameManager.createOrJoinPuzzle(
          { student: 'Alice', mentor: 'Bob', role: 'mentor', socketId: 'sMentor', credentials: 'token-bob' }, io
        )
      ).rejects.toThrow(/misconfigured/);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('rejects a mentor paired with a different student (mismatched pairing)', async () => {
      mockGetMentorship(200, { username: 'SomeoneElse', firstName: 'X', lastName: 'Y' });
      const { io, addSocket } = makeIo();
      addSocket('sMentor');
      await expect(
        gameManager.createOrJoinPuzzle(
          { student: 'Alice', mentor: 'Bob', role: 'mentor', socketId: 'sMentor', credentials: 'token-bob' }, io
        )
      ).rejects.toThrow(/not this student's mentor/);
    });

    test('the student solves even when the mentor connects first', async () => {
      mockGetMentorship(200, { username: 'Alice', firstName: 'Bob', lastName: 'Smith' });
      const { io, emitted, addSocket } = makeIo();
      addSocket('sMentor');
      addSocket('sStudent');

      // Mentor connects FIRST — must still end up as the observer.
      await gameManager.createOrJoinPuzzle(
        { student: 'Alice', mentor: 'Bob', role: 'mentor', socketId: 'sMentor', credentials: 'token-bob' }, io
      );
      // Student connects second.
      await gameManager.createOrJoinPuzzle(
        { student: 'Alice', mentor: 'Bob', role: 'student', socketId: 'sStudent' }, io
      );

      expect(eventsFor(emitted, 'sMentor')).toContain('guest');
      expect(eventsFor(emitted, 'sMentor')).not.toContain('host'); // mentor is never the driver
      expect(eventsFor(emitted, 'sStudent')).toContain('host');    // student always drives
      expect(gameManager.ongoingGames.length).toBe(1);             // one shared room

      const room = gameManager.ongoingGames[0];
      expect(room.student.id).toBe('sStudent');
      expect(room.mentor.id).toBe('sMentor');
    });

    test('rejects an invalid role', async () => {
      const { io, addSocket } = makeIo();
      addSocket('sX');
      await expect(
        gameManager.createOrJoinPuzzle(
          { student: 'Alice', mentor: 'Bob', role: 'parent', socketId: 'sX' }, io
        )
      ).rejects.toThrow(/Invalid role/);
    });

    // --- Seat enforcement: only the student may move/undo ----------------

    test('a move from the mentor seat is rejected', async () => {
      mockGetMentorship(200, { username: 'Alice' });
      const { io, addSocket } = makeIo();
      addSocket('sStudent');
      addSocket('sMentor');
      await gameManager.createOrJoinPuzzle(
        { student: 'Alice', mentor: 'Bob', role: 'student', socketId: 'sStudent' }, io
      );
      await gameManager.createOrJoinPuzzle(
        { student: 'Alice', mentor: 'Bob', role: 'mentor', socketId: 'sMentor', credentials: 'token-bob' }, io
      );

      expect(() => gameManager.makeMove('sMentor', 'e2', 'e4')).toThrow(/Only the student may move/);
    });

    test('a move from the student seat succeeds', async () => {
      const { io, addSocket } = makeIo();
      addSocket('sStudent');
      await gameManager.createOrJoinPuzzle(
        { student: 'Alice', mentor: 'Bob', role: 'student', socketId: 'sStudent' }, io
      );

      const moveResult = gameManager.makeMove('sStudent', 'e2', 'e4');
      expect(moveResult.result.move.from).toBe('e2');
    });

    test('an undo from the mentor seat is rejected', async () => {
      mockGetMentorship(200, { username: 'Alice' });
      const { io, addSocket } = makeIo();
      addSocket('sStudent');
      addSocket('sMentor');
      await gameManager.createOrJoinPuzzle(
        { student: 'Alice', mentor: 'Bob', role: 'student', socketId: 'sStudent' }, io
      );
      gameManager.makeMove('sStudent', 'e2', 'e4');
      await gameManager.createOrJoinPuzzle(
        { student: 'Alice', mentor: 'Bob', role: 'mentor', socketId: 'sMentor', credentials: 'token-bob' }, io
      );

      expect(() => gameManager.undoMove('sMentor')).toThrow(/Only the student may undo/);
    });

    test('an undo from the student seat succeeds', async () => {
      const { io, addSocket } = makeIo();
      addSocket('sStudent');
      await gameManager.createOrJoinPuzzle(
        { student: 'Alice', mentor: 'Bob', role: 'student', socketId: 'sStudent' }, io
      );
      gameManager.makeMove('sStudent', 'e2', 'e4');

      const undoResult = gameManager.undoMove('sStudent');
      expect(undoResult.undoneMove.to).toBe('e4');
    });

    test('the seat check does not affect regular mentor-vs-student games (not puzzles)', () => {
      // createOrJoinGame games have no isPuzzle flag, so the mentor must still
      // be able to move on their own turn.
      const { game } = gameManager.createOrJoinGame({
        student: 'Alice', mentor: 'Bob', role: 'student', socketId: 'sBlack'
      });
      game.mentor.id = 'sWhite';
      const moveResult = gameManager.makeMove('sWhite', 'f2', 'f3'); // white (mentor) moves first
      expect(moveResult.result.move.from).toBe('f2');
    });
  });
});
