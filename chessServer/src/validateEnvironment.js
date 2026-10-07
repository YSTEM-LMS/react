const REQUIRED_PRODUCTION_VARS = [
  "MIDDLEWARE_URL",
];

function hasCorsConfiguration() {
  return Boolean(
    process.env.CORS_ORIGIN?.trim() ||
    process.env.ALLOWED_ORIGINS?.trim()
  );
}

function validateEnvironment() {
  if (process.env.NODE_ENV !== "production") {
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
      `[chessServer] Missing required production environment variables: ${missing.join(", ")}`
    );
    process.exit(1);
  }

  console.log("[chessServer] Required production environment variables validated");
}

module.exports = validateEnvironment;
