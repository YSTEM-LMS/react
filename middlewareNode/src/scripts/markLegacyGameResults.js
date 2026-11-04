/**
 * One-time migration: mark every pre-existing gameResults record
 * source: "legacy-unverified".
 *
 * See the PvP results plan (v2), T6. The player-facing POST /gameResults never
 * actually reached the database before this plan (the chess server sent an
 * `Authentication` header; passport only reads `Authorization` — see finding
 * #1), so any record that predates CHESS_SERVICE_KEY reporting did not come
 * through the verified chessServer path. "legacy-unverified" doesn't claim
 * those games didn't happen — it just means they weren't recorded through a
 * path that checked a real accepted PvpGame. Devin decides whether chess
 * score should exclude them; Karthik's backfill should read only
 * source: "chessServer" (see the plan's T6/T8 notes).
 *
 * Usage:
 *   node src/scripts/markLegacyGameResults.js
 *
 * Safe to run multiple times — only touches documents missing `source`.
 * New records from the chess server always set `source` themselves, so this
 * script never overwrites one.
 */

require("dotenv").config();
const mongoose = require("mongoose");
const config = require("config");

async function run() {
  await mongoose.connect(config.get("mongoURI"));
  console.log("Connected to MongoDB");

  const result = await mongoose.connection.collection("gameresults").updateMany(
    { source: { $exists: false } },
    { $set: { source: "legacy-unverified" } }
  );

  console.log(`Migration complete: ${result.modifiedCount} documents marked legacy-unverified`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
