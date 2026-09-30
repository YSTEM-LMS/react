/**
 * Regenerate src/data/puzzles.seed.json from the public Lichess puzzle database.
 *
 * Instead of importing all ~4M puzzles, this pulls only the themes the app
 * serves (FEATURED_PUZZLE_THEMES) with a per-theme cap, keeping the seed small.
 * It range-downloads just the first chunk of the compressed CSV and decompresses
 * it in pure JS, stopping as soon as every theme's quota is filled (the CSV is
 * id-sorted, so the head is effectively a random sample across ratings/themes).
 *
 * Requires the pure-JS zstd decoder, which is NOT a project dependency:
 *   npm i fzstd            # run once, ad hoc; do not commit to package.json
 *   node src/scripts/generatePuzzleFixture.js
 *
 * Env:
 *   CAP=50        puzzles per featured theme (default 50)
 *   BYTES=80      MB of the compressed CSV to fetch (default 80)
 */
const fs = require("fs");
const path = require("path");

const CSV_URL = "https://database.lichess.org/lichess_db_puzzle.csv.zst";
const FEATURED = [
  "mateIn1", "mateIn2", "fork", "pin", "skewer", "discoveredAttack",
  "deflection", "sacrifice", "promotion", "endgame", "opening",
  "middlegame", "zugzwang", "advancedPawn",
];
const CAP = parseInt(process.env.CAP || "50", 10);
const BYTES = parseInt(process.env.BYTES || "80", 10) * 1024 * 1024;
const OUT = path.join(__dirname, "..", "data", "puzzles.seed.json");

const featuredSet = new Set(FEATURED);
const counts = Object.fromEntries(FEATURED.map((t) => [t, 0]));
const added = new Set();
const rows = [];
const decoder = new TextDecoder();
let leftover = "";
let headerSkipped = false;
let done = false;

const allFull = () => FEATURED.every((t) => counts[t] >= CAP);

function handleLine(line) {
  if (!line) return;
  if (!headerSkipped) {
    headerSkipped = true;
    if (line.startsWith("PuzzleId")) return;
  }
  const f = line.split(","); // first 8 cols contain no commas
  if (f.length < 8) return;
  const [PuzzleId, FEN, Moves, ratingStr, , , nbPlaysStr, Themes] = f;
  if (!PuzzleId || !FEN || !Moves || !Themes || added.has(PuzzleId)) return;

  const tokens = Themes.split(" ");
  const wanted = tokens.filter((t) => featuredSet.has(t) && counts[t] < CAP);
  if (wanted.length === 0) return;

  added.add(PuzzleId);
  rows.push({
    PuzzleId,
    FEN,
    Moves,
    Rating: Number.parseInt(ratingStr, 10) || null,
    NbPlays: Number.parseInt(nbPlaysStr, 10) || null,
    Themes,
    GameUrl: `https://lichess.org/training/${PuzzleId}`,
  });
  for (const t of tokens) if (featuredSet.has(t)) counts[t]++;
  if (allFull()) done = true;
}

function onData(chunk) {
  if (done) return;
  leftover += decoder.decode(chunk, { stream: true });
  let idx;
  while (!done && (idx = leftover.indexOf("\n")) !== -1) {
    handleLine(leftover.slice(0, idx).replace(/\r$/, ""));
    leftover = leftover.slice(idx + 1);
  }
}

async function main() {
  const fzstd = require("fzstd"); // ad-hoc dep, see header
  console.log(`Fetching first ${BYTES / 1024 / 1024}MB of ${CSV_URL} ...`);
  const res = await fetch(CSV_URL, { headers: { Range: `bytes=0-${BYTES - 1}` } });
  if (!res.ok && res.status !== 206) throw new Error(`Download failed: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());

  const stream = new fzstd.Decompress((chunk) => onData(chunk));
  const CHUNK = 4 * 1024 * 1024;
  try {
    for (let off = 0; off < buf.length && !done; off += CHUNK) {
      stream.push(buf.subarray(off, Math.min(off + CHUNK, buf.length)), false);
    }
  } catch (e) {
    // Expected: the final block of a range-truncated stream can't be decoded.
    console.log(`(stopped at truncation: ${e.message})`);
  }

  fs.writeFileSync(OUT, JSON.stringify(rows, null, 2));
  console.log(`Collected ${rows.length} puzzles -> ${OUT}`);
  console.log("Per-theme:", JSON.stringify(counts));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
