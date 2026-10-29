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
  //
  // gameId, username, white and black all come from the middleware's
  // GET /challenge/game/:gameId response (verified by EventHandlers before
  // calling this) — never from the client directly. See the PvP results
  // plan (v2), T4.

  test('creates a PvP game and seats white as white', () => {
    const res = gameManager.createOrJoinPvpGame({
      gameId: 'g1', white: 'Alice', black: 'Cara',
      username: 'Alice', socketId: 'sA'
    });
    expect(res.newGame).toBe(true);
    expect(res.color).toBe('white');
    expect(res.game.isPvp).toBe(true);
    expect(gameManager.getGameByGameId('g1')).toBe(res.game);
  });

  test('reconnecting with the same username reclaims the original seat', () => {
    gameManager.createOrJoinPvpGame({
      gameId: 'g1', white: 'Alice', black: 'Cara',
      username: 'Alice', socketId: 'sA'
    });
    const res = gameManager.createOrJoinPvpGame({
      gameId: 'g1', white: 'Alice', black: 'Cara',
      username: 'Alice', socketId: 'sA2'
    });
    const alice = res.game.players.find((p) => p.username === 'Alice');
    expect(alice.id).toBe('sA2');
    expect(res.color).toBe('white');
    expect(res.newGame).toBe(false);
  });

  test('second PvP player joins the same game by gameId as black', () => {
    gameManager.createOrJoinPvpGame({
      gameId: 'g1', white: 'Alice', black: 'Cara',
      username: 'Alice', socketId: 'sA'
    });
    const res = gameManager.createOrJoinPvpGame({
      gameId: 'g1', white: 'Alice', black: 'Cara',
      username: 'Cara', socketId: 'sC'
    });
    expect(res.newGame).toBe(false);
    expect(res.color).toBe('black');
    expect(gameManager.ongoingGames.length).toBe(1);
  });

  test('rejects a non-player trying to join a PvP game', () => {
    expect(() => gameManager.createOrJoinPvpGame({
      gameId: 'g1', white: 'Alice', black: 'Cara',
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
      gameId: 'g1', white: 'Alice', black: 'Cara',
      username: 'Alice', socketId: 'sA'
    });
    gameManager.createOrJoinPvpGame({
      gameId: 'g1', white: 'Alice', black: 'Cara',
      username: 'Cara', socketId: 'sC'
    });
    const res = gameManager.resign('sC', 'disconnect'); // Cara drops
    expect(res.outcome.winnerUsername).toBe('Alice');
    expect(res.outcome.reason).toBe('disconnect');
  });
});
