/**
 * Seed the `puzzles` collection with real Lichess puzzles covering exactly the
 * themes the app serves (the FEATURED_PUZZLE_THEMES on the Puzzles page), plus
 * a full rating spread for Puzzle Streak.
 *
 * The data lives in src/data/puzzles.seed.json (committed, ~550 puzzles). It was
 * generated from the public Lichess puzzle database — see
 * src/scripts/generatePuzzleFixture.js to regenerate/expand it.
 *
 * Usage:
 *   node src/scripts/seedPuzzles.js
 *   npm run seed:puzzles
 *
 * This REPLACES the collection contents (drops the old rows, inserts the
 * fixture) so it is safe to re-run and always yields the same known-good set.
 */

require("dotenv").config();
const mongoose = require("mongoose");
const config = require("config");
const path = require("path");

const FIXTURE = path.join(__dirname, "..", "data", "puzzles.seed.json");

async function run() {
  const puzzles = require(FIXTURE);
  if (!Array.isArray(puzzles) || puzzles.length === 0) {
    throw new Error(`No puzzles found in ${FIXTURE}`);
  }

  await mongoose.connect(config.get("mongoURI"));
  console.log("Connected to MongoDB");

  const collection = mongoose.connection.collection("puzzles");

  const before = await collection.countDocuments();
  await collection.deleteMany({});
  console.log(`Cleared ${before} existing puzzle(s)`);

  const result = await collection.insertMany(puzzles, { ordered: false });
  console.log(`Inserted ${result.insertedCount} puzzles`);

  // Indexes: unique id (idempotency), Rating for the streak's range queries.
  await collection.createIndex({ PuzzleId: 1 }, { unique: true, background: true });
  await collection.createIndex({ Rating: 1 }, { background: true });
  console.log("Indexes ensured (PuzzleId unique, Rating)");

  // Quick summary of theme coverage.
  const themeCounts = {};
  for (const p of puzzles) {
    for (const t of String(p.Themes || "").split(" ")) {
      if (t) themeCounts[t] = (themeCounts[t] || 0) + 1;
    }
  }
  const featured = [
    "mateIn1", "mateIn2", "fork", "pin", "skewer", "discoveredAttack",
    "deflection", "sacrifice", "promotion", "endgame", "opening",
    "middlegame", "zugzwang", "advancedPawn",
  ];
  console.log(
    "Featured theme coverage:",
    JSON.stringify(Object.fromEntries(featured.map((t) => [t, themeCounts[t] || 0])))
  );

  await mongoose.disconnect();
  console.log("Done.");
}

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
