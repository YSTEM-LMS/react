const { spawn } = require('child_process');
const crypto = require("crypto");
const { Chess } = require("chess.js");
const path = require("path");

// Determine the correct Stockfish binary path based on platform
let enginePath;

switch (process.platform) {
    case 'win32':
      enginePath = path.join(__dirname, "..", "bin", "stockfish_11_win.exe");
      break;
    case 'darwin':
      enginePath = path.join(__dirname, "..", "bin", "stockfish_11_mac");
      break;
    case 'linux':
      enginePath = path.join(__dirname, "..", "bin", "stockfish_11_linux");
      break;
    default:
      throw new Error(`Unsupported platform: ${process.platform}`);
}

/**
 * Manages Stockfish engine sessions for multiple clients
 */
class StockfishManager {
  constructor() {
    // Session types: lessons, player vs computer, miscellaneous
    this.sessions = new Map();
  }

  /**
   * Configures engine event listeners for a session
   * @param {string} socketId - Socket ID of the client session
   */
  _configureEngine(socketId) {
    const session = this.sessions.get(socketId);
    const engine = session.stockfishEngine;

    // Stockfish instance does not exist for this session
    if (!engine) {
      throw new Error("Stockfish instance not set up for this session");
    }

    // Attach an event listener to listen for output from the engine
    // Also log any stderr from the engine so it appears in server logs
    try {
      if (engine.stderr && typeof engine.stderr.on === 'function') {
        engine.stderr.on('data', (errData) => {
          const text = String(errData || '').trim();
          if (text) console.error(`Stockfish [stderr] (${session.socket.id}):`, text);
        });
      }
    } catch (e) {
      // ignore
    }

    engine.stdout.on("data", (data) => {
      const lines = data.toString().split(/\r?\n/);

      // Process each line of output from Stockfish
      for (const line of lines) {
        let cleanLine = (line || '').trim();

        // Always print raw engine output to server debug logs to aid troubleshooting
        try {
          if (cleanLine) console.debug(`Stockfish [stdout] (${session.socket.id}):`, cleanLine);
        } catch (e) {}

        // Skip empty lines
        if (!cleanLine) continue;

        // If we're not awaiting a response for this session we still log but otherwise ignore handling
        if (!session.awaitingResponse) continue;

        const isInfoMode = session.infoMode;

        // In info mode, collect all engine analysis output
        if (isInfoMode) {
          session.outputBuffer.push(cleanLine);

          if (cleanLine.startsWith("bestmove")) {
            session.socket.emit("evaluation-complete", {
              mode: 'info',
              output: session.outputBuffer,
            });

            session.awaitingResponse = false;
            session.outputBuffer = [];
          }
        // In move mode, extract and execute the best move
        } else if (cleanLine.startsWith("bestmove")) {
          const moveStr = cleanLine.split(/\s+/)[1];

          // Attempt to execute the move on the game instance
          let moveResult = null;
          try {
            moveResult = session.gameInstance.move(moveStr, { sloppy: true });
          } catch (e) {
            return session.socket.emit("evaluation-error", {
              error: "Invalid move from engine",
            });
          }

          const newFEN = session.gameInstance.fen();

          // Send the move result back to the client
          session.socket.emit("evaluation-complete", {
            mode: 'move',
            move: moveStr,
            moveDetails: moveResult,
            newFEN,
          });

          session.awaitingResponse = false;
          session.outputBuffer = [];
        }
      }
    });

    
  }

  /**
   * Registers a new Stockfish session for a client
   * @param {Socket} socket - Socket.IO socket instance
   * @param {string} sessionType - Type of session (e.g., 'lesson', 'pvp')
   * @param {string} fen - Optional FEN string for initial board position
   * @param {boolean} infoMode - Whether to return detailed analysis
   */
  registerSession(socket, sessionType, fen = null, infoMode = false) {
    const socketId = socket.id;

    // Ensure session doesn't already exist
    if (this.sessions.has(socketId)) {
      throw new Error("Session already exists!");
    }

    // Initialize a new chess game with the provided FEN or default position
    const game = new Chess(fen || undefined);

    const sessionId = crypto.randomUUID();
    const engine = spawn(enginePath);

    // The OS-level failure when enginePath isn't executable (EACCES) surfaces
    // asynchronously as an 'error' event, not a synchronous throw from spawn().
    // Without this listener, Node rethrows it as an uncaught exception and
    // crashes the whole process for every connected client.
    engine.on('error', (err) => {
      console.error(`Stockfish engine failed to start for session ${sessionId}:`, err.message);
      if (this.sessions.has(socketId)) {
        this.sessions.delete(socketId);
      }
      try {
        socket.emit('session-error', { error: 'Chess engine failed to start' });
      } catch (e) {
        // socket already closed, nothing to notify
      }
    });

    // Log engine spawn for debugging (enginePath and pid)
    try {
      console.log(`Spawned Stockfish engine for session ${sessionId} at ${enginePath} (pid=${engine.pid})`);
    } catch (e) {}

    // Create and store the session data
    this.sessions.set(socketId, {
      id: sessionId,
      sessionType,
      gameFen: fen,
      infoMode,
      stockfishEngine: engine,
      gameInstance: game,
      outputBuffer: [],
      engineReady: false,
      awaitingResponse: false,
      socket,
    });

    this._configureEngine(socketId);
  }

  /**
   * Updates the FEN position for an existing session
   * @param {string} socketId - Socket ID of the client session
   * @param {string} fen - New FEN string to set
   */
  updateFen(socketId, fen) {
    const session = this.sessions.get(socketId);

    if (!session) {
      throw new Error("Session not found!");
    }

    // Validate FEN string
    if (fen === "" || null) {
      throw new Error("Invalid FEN");
    }

    // Update the game position
    session.gameFen = fen;
    session.gameInstance = new Chess(fen);
  }

  /**
   * Requests Stockfish to evaluate a position and return the best move
   * @param {string} socketId - Socket ID of the client session
   * @param {string} fen - FEN string to evaluate
   * @param {string} move - Optional move to append
   * @param {number} level - Search depth (1-30)
   */
  evaluateFen(socketId, fen, move = "", level = 10) {
    const session = this.sessions.get(socketId);

    if (!session) {
      throw new Error("Session not found!");
    }

    const engine = session.stockfishEngine;
    session.awaitingResponse = true;
    session.outputBuffer = [];
    session.gameInstance.load(fen);
    session.gameFen = fen;

    // Limit search depth to maximum of 30
    const maxLevel = 30;
    const minDepth = Math.min(parseInt(level), maxLevel);

    // Send position to engine with optional move sequence
    if (move.length) {
      engine.stdin.write(`position fen ${fen} moves ${move}\n`);
    }
    else {
      engine.stdin.write(`position fen ${fen}\n`);
    }
    
    // Request engine to search to specified depth
    engine.stdin.write(`go depth ${minDepth}\n`);
  }

  /**
   * Deletes a session and terminates the Stockfish process
   * @param {string} socketId - Socket ID of the client session
   */
  deleteSession(socketId) {
    const session = this.sessions.get(socketId);

    if (session) {
      session.stockfishEngine.kill();
      this.sessions.delete(socketId);
      console.log(`Deleted session for ${socketId}`);
    }
  }
}

module.exports = StockfishManager;
module.exports.enginePath = enginePath;
