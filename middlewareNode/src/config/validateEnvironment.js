const REQUIRED_PRODUCTION_VARS = [
  "MONGO_URI",
  "INDEX_KEY",
  "CORS_ORIGIN",
  "SESSION_SECRET",
];

// Local-only environments skip validation. Anything else (production, but
// also staging, qa, or a typo like "prod") is treated as a real deployment
// and must be fully configured, instead of silently booting with dev
// fallbacks such as middlewareNode's generated dev INDEX_KEY.
const LOCAL_ENVIRONMENTS = new Set(["", "development", "test"]);

function isLocalEnvironment() {
  return LOCAL_ENVIRONMENTS.has((process.env.NODE_ENV || "").trim());
}

function validateEnvironment() {
  if (isLocalEnvironment()) {
    return;
  }

  const missing = REQUIRED_PRODUCTION_VARS.filter((name) => {
    const value = process.env[name];
    return !value || !value.trim();
  });

  if (missing.length > 0) {
    console.error(
      `[boot] Missing required environment variables for NODE_ENV=${process.env.NODE_ENV}: ${missing.join(", ")}`
    );
    process.exit(1);
  }

  console.log("[boot] Required environment variables validated");
}

module.exports = validateEnvironment;
module.exports.isLocalEnvironment = isLocalEnvironment;
