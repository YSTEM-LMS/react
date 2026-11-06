/**
 * Database name for the raw MongoClient fallback in the getDb() helpers
 * (routes/activities.js, routes/lessons.js, routes/users.js,
 * scheduler/activitiesScheduler.js, utils/activities.js).
 *
 * Those helpers normally return Mongoose's connection, which uses the
 * database named in MONGO_URI. The fallback only runs before Mongoose has
 * connected (startup, or the scheduler's first run), and it used to be
 * hardcoded to "ystem", so any environment whose MONGO_URI names a different
 * database (the dev stack uses "ystem_dev") read an empty database there.
 *
 * This returns the database named in the URI, so the fallback reads the same
 * database Mongoose does. A URI that names none keeps "ystem", the previous
 * behaviour, rather than the driver's default of "test".
 */

const LEGACY_DEFAULT = "ystem";

function fallbackDbName(uri) {
  const match = /^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]*)/.exec(uri || "");
  const name = match && match[1] ? decodeURIComponent(match[1]) : "";
  return name || LEGACY_DEFAULT;
}

module.exports = fallbackDbName;
