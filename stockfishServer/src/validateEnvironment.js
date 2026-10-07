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

  const missing = [];

  if (!hasCorsConfiguration()) {
    missing.push("CORS_ORIGIN or ALLOWED_ORIGINS");
  }

  if (missing.length > 0) {
    console.error(
      `[stockfishServer] Missing required production environment variables: ${missing.join(", ")}`
    );
    process.exit(1);
  }

  console.log("[stockfishServer] Required production environment variables validated");
}

module.exports = validateEnvironment;
