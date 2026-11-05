/**
 * Real-database integration test for
 * src/scripts/migratePuzzleFieldCasing.js — the one-time rename of the old
 * lowercase/mixed-case puzzle fields to the capitalized names the schema,
 * routes, and Puzzles.tsx now use.
 */

const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const { migrate } = require("../src/scripts/migratePuzzleFieldCasing");

jest.setTimeout(60000);

let mongod;
let collection;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({
    instance: { launchTimeout: 30000 },
  });
  await mongoose.connect(mongod.getUri() + "migration-test");
  // migrate() only reads `dbName` to enforce that it's non-empty — the real
  // database selection already happened via mongoose.connect() above, same
  // as every other script in src/scripts/.
  collection = mongoose.connection.collection("puzzles");
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  await collection.deleteMany({});
});

describe("migratePuzzleFieldCasing", () => {
  it("renames every old field to its new name, preserving values", async () => {
    await collection.insertOne({
      puzzleId: "00008",
      moves: "f2g3 e6e7",
      rating: 1939,
      ratingDeviation: 75,
      popularity: 92,
      nbPlays: 10000,
      themes: "crushing hangingPiece",
      gameUrl: "https://lichess.org/training/00008",
      openingTags: "",
    });

    await migrate({ dbName: "migration-test", dryRun: false }, collection);

    const doc = await collection.findOne({});
    expect(doc).toMatchObject({
      PuzzleId: "00008",
      Moves: "f2g3 e6e7",
      Rating: 1939,
      RatingDeviation: 75,
      Popularity: 92,
      NbPlays: 10000,
      Themes: "crushing hangingPiece",
      GameUrl: "https://lichess.org/training/00008",
      OpeningTags: "",
    });
    // $rename removes the old key entirely.
    expect(doc.puzzleId).toBeUndefined();
    expect(doc.moves).toBeUndefined();
    expect(doc.rating).toBeUndefined();
  });

  it("leaves an already-capitalized document untouched", async () => {
    const original = {
      PuzzleId: "00009",
      FEN: "r6k/pp2r2p/4Rp1Q/3p4/8/1N1P2R1/PqP2bPP/7K b - - 0 24",
      Moves: "f2g3 e6e7",
      Rating: 1939,
      Themes: "crushing",
    };
    // insertOne mutates its argument, adding _id — strip it back off so the
    // comparison below isn't checking against a moving target.
    await collection.insertOne(original);
    delete original._id;

    const results = await migrate({ dbName: "migration-test", dryRun: false }, collection);

    expect(Object.values(results).every((n) => n === 0)).toBe(true);
    const doc = await collection.findOne({}, { projection: { _id: 0 } });
    expect(doc).toEqual(original);
  });

  it("on a mixed document, renames only the fields still missing their new name", async () => {
    // Simulates a document that was partially migrated already: Moves is
    // already correct, but puzzleId/rating are still old-cased. The
    // pre-existing Moves value must not be touched or overwritten.
    await collection.insertOne({
      puzzleId: "00010",
      Moves: "already correct",
      moves: "stale value that must never overwrite Moves",
      rating: 1500,
    });

    await migrate({ dbName: "migration-test", dryRun: false }, collection);

    const doc = await collection.findOne({});
    expect(doc.PuzzleId).toBe("00010");
    expect(doc.Rating).toBe(1500);
    expect(doc.Moves).toBe("already correct");
    expect(doc.moves).toBe("stale value that must never overwrite Moves");
  });

  it("is a no-op the second time it's run (safe to re-run)", async () => {
    await collection.insertOne({ puzzleId: "00011", moves: "a2a3 a7a6", rating: 1200 });

    await migrate({ dbName: "migration-test", dryRun: false }, collection);
    const afterFirstRun = await collection.findOne({}, { projection: { _id: 0 } });

    const secondRunResults = await migrate({ dbName: "migration-test", dryRun: false }, collection);
    const afterSecondRun = await collection.findOne({}, { projection: { _id: 0 } });

    expect(Object.values(secondRunResults).every((n) => n === 0)).toBe(true);
    expect(afterSecondRun).toEqual(afterFirstRun);
  });

  it("in --dry-run, prints per-field counts and writes nothing", async () => {
    await collection.insertOne({ puzzleId: "00012", moves: "a2a3 a7a6", rating: 1200 });
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    const results = await migrate({ dbName: "migration-test", dryRun: true }, collection);

    expect(results.puzzleId).toBe(1);
    expect(results.moves).toBe(1);
    expect(results.rating).toBe(1);
    expect(results.themes).toBe(0);
    expect(logSpy.mock.calls.some(([line]) => line.includes("[dry run]"))).toBe(true);

    const doc = await collection.findOne({});
    expect(doc.puzzleId).toBe("00012"); // unchanged
    expect(doc.PuzzleId).toBeUndefined(); // nothing written

    logSpy.mockRestore();
  });

  it("throws when --db is missing", async () => {
    await expect(migrate({ dbName: null, dryRun: false }, collection)).rejects.toThrow(/--db/);
  });
});
