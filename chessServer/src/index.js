require("dotenv").config();

const validateEnvironment = require("./validateEnvironment");
validateEnvironment();

const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const morgan = require("morgan");
const registerSocketHandlers = require("./managers/EventHandlers");

const app = express();
const server = http.createServer(app);

// Add logging functionaility to the server
app.use(morgan("dev")); // dev -> preset format

const isProduction = process.env.NODE_ENV === "production";

const allowedOriginsSetting =
  process.env.CORS_ORIGIN || process.env.ALLOWED_ORIGINS;

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

// Apply CORS middleware to handle cross-origin requests
app.use(cors(corsOptions));

// Initialize Socket.IO with CORS configuration
const io = socketIo(server, {
  cors: corsOptions,
});

// Register socket event handlers upon client connection
io.on("connection", (socket) => {
  registerSocketHandlers(socket, io);
});

// Start the server and listen on the defined port
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

module.exports = { server, io };
