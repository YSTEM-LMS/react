/**
 * Resolves which MongoDB database the app should use, in priority order:
 *   1. an explicit name (MONGO_DB_NAME), if set and non-empty
 *   2. the database name in the Mongo URI's own path (query params ignored)
 *   3. null — no database name could be determined at all
 *
 * Centralized so mongoose's connect() and every getDb()'s cachedClient.db()
 * resolve to the exact same database, instead of each independently landing
 * on the native driver's own default ("test") whenever the URI has no path.
 */

function dbNameFromUri(mongoURI) {
  if (!mongoURI) return null;

  try {
    // The URL class doesn't know the mongodb(+srv) schemes, but a path and
    // query string parse identically under any scheme it does know — same
    // trick src/config/db.js already uses for its boot-log line.
    const parsable = mongoURI
      .replace("mongodb+srv://", "https://")
      .replace("mongodb://", "http://");
    const name = new URL(parsable).pathname.replace(/^\//, "");
    return name || null;
  } catch (_) {
    return null;
  }
}

function resolveDbName(mongoURI, explicitDbName) {
  const explicit = (explicitDbName || "").trim();
  if (explicit) return explicit;

  return dbNameFromUri(mongoURI);
}

module.exports = { resolveDbName, dbNameFromUri };
