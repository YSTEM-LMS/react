const REQUIRED_PRODUCTION_VARS = [
  "MIDDLEWARE_URL",
];

function hasCorsConfiguration() {
  return Boolean(
    process.env.CORS_ORIGIN?.trim() ||
    process.env.ALLOWED_ORIGINS?.trim()
  );
}

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

  if (!hasCorsConfiguration()) {
    missing.push("CORS_ORIGIN or ALLOWED_ORIGINS");
  }

  if (missing.length > 0) {
    console.error(
      `[chessServer] Missing required environment variables for NODE_ENV=${process.env.NODE_ENV}: ${missing.join(", ")}`
    );
    process.exit(1);
  }

  console.log("[chessServer] Required environment variables validated");
}

module.exports = validateEnvironment;
