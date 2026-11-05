/**
 * One-time migration: renames the puzzle fields from main's original casing
 * to the capitalized names the schema, routes, and Puzzles.tsx now use
 * (puzzleId -> PuzzleId, moves -> Moves, rating -> Rating, ratingDeviation ->
 * RatingDeviation, popularity -> Popularity, nbPlays -> NbPlays, themes ->
 * Themes, gameUrl -> GameUrl, openingTags -> OpeningTags). FEN was already
 * capitalized on every version of the schema, so it's left alone.
 *
 * Safe to run more than once: each field is renamed with
 *   updateMany({ [old]: { $exists: true }, [new]: { $exists: false } }, ...)
 * so a document that's already been renamed (or was freshly seeded with the
 * new names) is never touched again, and an existing new-named field is
 * never overwritten by a stale old one. Nothing is ever loaded into memory
 * — this runs entirely as updateMany/countDocuments on the server.
 *
 * Usage:
 *   node src/scripts/migratePuzzleFieldCasing.js --db=<database-name> [--dry-run]
 *
 * --db is required — there is no default — so this can never accidentally
 * run against whatever database config.get("mongoURI") happens to point at.
 * --dry-run prints, per field, how many documents would change, and writes
 * nothing.
 */

require("dotenv").config();
const mongoose = require("mongoose");
const config = require("config");

const RENAMES = {
  puzzleId: "PuzzleId",
  moves: "Moves",
  rating: "Rating",
  ratingDeviation: "RatingDeviation",
  popularity: "Popularity",
  nbPlays: "NbPlays",
  themes: "Themes",
  gameUrl: "GameUrl",
  openingTags: "OpeningTags",
};

function parseArgs(argv) {
  const dbArg = argv.find((a) => a.startsWith("--db="));
  return {
    dbName: dbArg ? dbArg.slice("--db=".length) : null,
    dryRun: argv.includes("--dry-run"),
  };
}

async function migrate({ dbName, dryRun }, collection) {
  if (!dbName) {
    throw new Error("--db=<database-name> is required (refusing to guess a database)");
  }

  const results = {};

  for (const [oldName, newName] of Object.entries(RENAMES)) {
    const filter = { [oldName]: { $exists: true }, [newName]: { $exists: false } };

    if (dryRun) {
      const count = await collection.countDocuments(filter);
      results[oldName] = count;
      console.log(`[dry run] ${oldName} -> ${newName}: ${count} document(s) would change`);
      continue;
    }

    const result = await collection.updateMany(filter, { $rename: { [oldName]: newName } });
    results[oldName] = result.modifiedCount;
    console.log(`${oldName} -> ${newName}: ${result.modifiedCount} document(s) updated`);
  }

  return results;
}

async function run() {
  const { dbName, dryRun } = parseArgs(process.argv.slice(2));

  if (!dbName) {
    console.error("Migration failed: --db=<database-name> is required (refusing to guess a database)");
    process.exit(1);
  }

  await mongoose.connect(config.get("mongoURI"));
  console.log("Connected to MongoDB");

  try {
    const collection = mongoose.connection.useDb(dbName, { useCache: true }).collection("puzzles");
    await migrate({ dbName, dryRun }, collection);
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  run().catch((err) => {
    console.error("Migration failed:", err.message);
    process.exit(1);
  });
}

module.exports = { migrate, RENAMES, parseArgs };
