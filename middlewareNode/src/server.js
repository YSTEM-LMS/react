// Main server configuration for the Node.js middleware API

// Load local environment variables before importing modules that read config.
require("dotenv").config();

// Validate production configuration before db.js, passport.js, or other
// modules can call config.get().
const validateEnvironment = require("./config/validateEnvironment");
validateEnvironment();

const express = require("express");
const session = require("express-session");
const connectDB = require("./config/db");
const passport = require("passport");
require("./config/passport.js");
const app = express();
const cors = require("cors");
const config = require("config");
const streakRoutes = require("./routes/streak");
const adminGuard   = require("./middleware/adminGuard");
const requireAuth  = require("./middleware/requireAuth");
const rateLimit    = require("express-rate-limit");

const analyticsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.ANALYTICS_RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

const leaderboardLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.LEADERBOARD_RATE_LIMIT_MAX) || 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

// Enable schedulers
require("./scheduler/activitiesScheduler.js");
require("./scheduler/analyticsSummaryScheduler.js");

// Enable CORS for cross-origin requests
const configuredCorsOrigin = config.get("corsOptions.origin");

const allowedOrigins = String(configuredCorsOrigin || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)
  .map((origin) => {
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

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || hasWildcard || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.warn(`CORS: rejected origin ${origin}`);
      return callback(null, false);
    },
    // When wildcard is configured, disallow credentials to prevent unsafe CORS configuration
    credentials: !hasWildcard,
  })
);

// Connect to MongoDB database
connectDB();

// Initialize JSON middleware for parsing request bodies
app.use(express.json({ extended: false }));

// Configure session middleware
app.use(
  session({
    secret:
      process.env.SESSION_SECRET ||
      (process.env.NODE_ENV !== "production"
        ? "dev-secret-change-in-prod"
        : undefined),
    resave: false,
    saveUninitialized: false,
  })
);

// Initialize Passport authentication middleware
app.use(passport.initialize());
app.use(passport.session());

// Define API routes
app.get("/", (req, res) => res.send("API Running"));
app.use("/user", require("./routes/users"));
app.use("/category", require("./routes/categorys"));
app.use("/meetings", require("./routes/meetings"));
app.use("/auth", require("./routes/auth"));
app.use("/timeTracking", require("./routes/timeTracking"));
app.use("/puzzles", require("./routes/puzzles"));
app.use("/lessons", require("./routes/lessons"));
app.use("/activities", require("./routes/activities"));
app.use("/streak", streakRoutes);
app.use("/badges", require("./routes/badges"));
app.use("/chat", require("./routes/chat"));
app.use("/challenge", require("./routes/challenge"));
app.use("/gameResults", requireAuth, require("./routes/gameResults"));
app.use("/analytics", analyticsLimiter, adminGuard, require("./routes/analytics"));
app.use("/leaderboard", leaderboardLimiter, requireAuth, require("./routes/leaderboard"));

// Start server on specified port
const PORT = process.env.PORT || 8000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
