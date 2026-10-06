/**
 * Fails fast in production when required secrets/config are missing, instead
 * of booting and silently degrading. CHESS_SERVICE_KEY unset has exactly that
 * silent-failure shape today: the PvP result report just logs and skips (see
 * EventHandlers.reportGameResult) — this is the production-startup guard the
 * PvP results plan (v2), T4, asks for, folded into the env check this repo's
 * "signed-environment-separation" work already added for MIDDLEWARE_URL/CORS.
 *
 * Only enforced when NODE_ENV === "production" — local/dev/test runs are
 * unaffected, same as the other "skip and log" call sites already behave.
 */

const REQUIRED_PRODUCTION_VARS = ["MIDDLEWARE_URL", "CHESS_SERVICE_KEY"];

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
