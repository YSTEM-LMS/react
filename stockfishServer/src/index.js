require("dotenv").config();

const validateEnvironment = require("./validateEnvironment");
validateEnvironment();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const initializeSocket = require("./managers/socket");

// Defense-in-depth: any future unhandled failure crashes loudly, with a clear
// log line, instead of silently taking down the process with no diagnostics.
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception, shutting down:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection, shutting down:', reason);
  process.exit(1);
});

const isProduction = process.env.NODE_ENV === "production";

const allowedOriginsSetting = process.env.CORS_ORIGIN || process.env.ALLOWED_ORIGINS;
const allowedOrigins = (allowedOriginsSetting
  ? allowedOriginsSetting.split(",").map((o) => o.trim())
  : [
      "https://ystemandchess.com",
      "https://www.ystemandchess.com",
      ...(isProduction
        ? []
        : [
            "http://localhost:3000",
            "http://localhost:3002",
            "http://localhost:4200",
          ]),
    ]
).map((origin) => {
  if (origin !== "*" && origin.endsWith("/")) {
    const normalized = origin.slice(0, -1);
    console.warn(
      `CORS: "${origin}" has a trailing slash, which never matches a browser's Origin header — using "${normalized}" instead`
    );
    return normalized;
  }
  return origin;
});

const hasWildcard = allowedOrigins.includes("*");

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (hasWildcard) {
      return callback(null, true);
    }
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`CORS: rejected origin ${origin}`);
      callback(null, false);
    }
  },
  methods: ["GET", "POST"],
  // When wildcard is configured, disallow credentials to prevent unsafe CORS configuration
  credentials: !hasWildcard,
};

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: corsOptions,
});

app.use(cors(corsOptions));
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// POST /api/analyze - attempt to use the running Stockfish engine manager when available.
app.post('/api/analyze', async (req, res) => {
  try {
    const { type } = req.body || {};
    if (type !== 'move') {
      return res.json({ success: false, error: 'Only move analysis is supported' });
    }

    const fenBefore = req.body.fen_before || '';
    const fenAfter = req.body.fen_after || '';
    const move = req.body.move || '';

    if (!fenBefore || !fenAfter || !move) {
      return res.json({ success: false, error: 'Missing fen_before, fen_after or move in request' });
    }

    // Try to use the in-process StockfishManager (created by socket manager) if available.
    let stockfishManager = null;
    try {
      const socketModule = require('./managers/socket');
      stockfishManager = socketModule.__stockfishManager;
    } catch (e) {
      // ignore
    }

    if (!stockfishManager) {
      // Fall back to simple material-only analysis (previous mock behavior)
      const { Chess } = require('chess.js');
      function materialSum(fen, color) {
        try {
          const ch = new Chess(fen);
          const board = ch.board();
          const values = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
          let sum = 0;
          for (let r = 0; r < 8; r++) {
            for (let f = 0; f < 8; f++) {
              const sq = board[r][f];
              if (!sq) continue;
              const v = values[sq.type] || 0;
              sum += sq.color === color ? v : -v;
            }
          }
          return sum;
        } catch (e) {
          return 0;
        }
      }

      const sideMoved = (fenBefore.split(' ')[1] === 'w') ? 'w' : 'b';
      const before = materialSum(fenBefore, sideMoved);
      const after = materialSum(fenAfter, sideMoved);
      const delta = after - before;

      let moveIndicator = 'Inaccuracy';
      if (delta >= 3) moveIndicator = 'Best';
      else if (delta >= 1) moveIndicator = 'Good';
      else if (delta <= -3) moveIndicator = 'Blunder';
      else if (delta <= -1) moveIndicator = 'Mistake';

      const analysisText = delta > 0
        ? `Net material gain of ${delta}. Favorable capture. Move: ${move}`
        : delta < 0
          ? `Net material loss of ${Math.abs(delta)}. This move lost material and may be a ${moveIndicator}. Move: ${move}`
          : `No material change. Move appears neutral. Move: ${move}`;

      const nextStepHint = (moveIndicator === 'Blunder' || moveIndicator === 'Mistake')
        ? 'Review the capture sequence and look for hanging pieces.'
        : 'Continue development and watch for opponent threats.';

      const explanation = {
        moveIndicator,
        Analysis: analysisText,
        nextStepHint,
      };

      return res.json({ success: true, explanation: JSON.stringify(explanation), bestMove: null });
    }

    // Use StockfishManager: create a temporary fake socket object to capture engine output
    const tmpId = `http-${Date.now()}-${Math.floor(Math.random()*10000)}`;
    let timeoutHandle = null;

    const promise = new Promise((resolve, reject) => {
      const fakeSocket = {
        id: tmpId,
        emit: (event, payload) => {
          if (event === 'evaluation-complete') {
            resolve(payload);
          } else if (event === 'session-error') {
            reject(new Error(payload.error));
          }
        },
      };

      try {
        stockfishManager.registerSession(fakeSocket, 'api', fenBefore, true);
        // ask the engine to evaluate the position
        stockfishManager.evaluateFen(fakeSocket.id, fenBefore, '', req.body.depth || 12);
      } catch (e) {
        reject(e);
        return;
      }

      // safety timeout
      timeoutHandle = setTimeout(() => {
        reject(new Error('Engine timed out')); 
      }, 10000);
    });

    let engineResult;
    try {
      engineResult = await promise;
    } catch (e) {
      // cleanup any temp session and fall back to mock
      try { stockfishManager.deleteSession(tmpId); } catch (ee) {}
      console.warn('Stockfish engine promise failed, falling back to mock:', e?.message || e);
      // Reuse previous mock code path (material delta)
      const { Chess } = require('chess.js');
      function materialSum(fen, color) {
        try {
          const ch = new Chess(fen);
          const board = ch.board();
          const values = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
          let sum = 0;
          for (let r = 0; r < 8; r++) {
            for (let f = 0; f < 8; f++) {
              const sq = board[r][f];
              if (!sq) continue;
              const v = values[sq.type] || 0;
              sum += sq.color === color ? v : -v;
            }
          }
          return sum;
        } catch (e) {
          return 0;
        }
      }

      const sideMoved = (fenBefore.split(' ')[1] === 'w') ? 'w' : 'b';
      const before = materialSum(fenBefore, sideMoved);
      const after = materialSum(fenAfter, sideMoved);
      const delta = after - before;

      let moveIndicator = 'Inaccuracy';
      if (delta >= 3) moveIndicator = 'Best';
      else if (delta >= 1) moveIndicator = 'Good';
      else if (delta <= -3) moveIndicator = 'Blunder';
      else if (delta <= -1) moveIndicator = 'Mistake';

      const analysisText = delta > 0
        ? `Net material gain of ${delta}. Favorable capture. Move: ${move}`
        : delta < 0
          ? `Net material loss of ${Math.abs(delta)}. This move lost material and may be a ${moveIndicator}. Move: ${move}`
          : `No material change. Move appears neutral. Move: ${move}`;

      const nextStepHint = (moveIndicator === 'Blunder' || moveIndicator === 'Mistake')
        ? 'Review the capture sequence and look for hanging pieces.'
        : 'Continue development and watch for opponent threats.';

      const explanation = {
        moveIndicator,
        Analysis: analysisText,
        nextStepHint,
      };

      return res.json({ success: true, explanation: JSON.stringify(explanation), bestMove: null });
    }

    // Got engineResult from StockfishManager (it returns output buffer for info-mode)
    try {
      // attempt to find bestmove and score in the output buffer
      let bestMove = null;
      let score = null;
      if (engineResult && Array.isArray(engineResult.output)) {
        for (const line of engineResult.output) {
          const bm = String(line).match(/bestmove\s+([a-h][1-8][a-h][1-8][qrbn]?)/i);
          if (bm) bestMove = bm[1];
          const sc = String(line).match(/score\s+cp\s+(-?\d+)/i);
          if (sc) score = parseInt(sc[1], 10);
        }
      }

      // Build a JSON explanation using engine output
      const explanation = {
        moveIndicator: bestMove ? 'Best' : 'Neutral',
        Analysis: `Engine returned ${engineResult.output?.length ?? 0} lines.`,
        nextStepHint: 'Review engine output for variations.',
      };

      // cleanup tmp session
      try { stockfishManager.deleteSession(tmpId); } catch (ee) {}

      return res.json({ success: true, explanation: JSON.stringify(explanation), bestMove: bestMove || null, score: score ?? null });
    } catch (e) {
      try { stockfishManager.deleteSession(tmpId); } catch (ee) {}
      return res.status(500).json({ success: false, error: 'Failed to parse engine output' });
    }
  } catch (err) {
    console.error('Error in /api/analyze', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

io.on("connection", (socket) => {
  console.log(`Client connected ${socket.id}`);
  initializeSocket(socket);
});

const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
  console.log(`Stockfish server running on port ${PORT}`);
});
