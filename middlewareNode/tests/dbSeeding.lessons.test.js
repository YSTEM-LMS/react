/**
 * Regression test: lesson seeding must add any lesson piece that's missing,
 * not only seed when the newLessons collection is empty. A dev database
 * seeded with older lesson names (e.g. on a persistent Mongo volume) has to
 * pick up corrected names on restart, or those lessons stay unavailable.
 *
 * mongoose is fully mocked; only the newLessons collection's calls are
 * checked.
 */

let mockExistingLessonPieces = [];

jest.mock("mongoose", () => {
  const lessons = {
    distinct: jest.fn(async () => mockExistingLessonPieces),
    countDocuments: jest.fn(async () => mockExistingLessonPieces.length),
    insertMany: jest.fn().mockResolvedValue({}),
  };
  const other = {
    createIndex: jest.fn().mockResolvedValue(undefined),
    countDocuments: jest.fn().mockResolvedValue(1),
    findOne: jest.fn().mockResolvedValue(null),
    insertOne: jest.fn().mockResolvedValue({}),
    insertMany: jest.fn().mockResolvedValue({}),
  };
  return {
    connect: jest.fn().mockResolvedValue(undefined),
    connection: {
      db: { collection: jest.fn((name) => (name === "newLessons" ? lessons : other)) },
      collection: jest.fn(() => other),
    },
    __lessons: lessons,
  };
});

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

beforeEach(() => {
  process.env.NODE_ENV = "development";
  jest.resetModules();
});

afterEach(() => {
  process.env.NODE_ENV = ORIGINAL_NODE_ENV;
});

async function runSeeding() {
  const mongoose = require("mongoose");
  mongoose.__lessons.insertMany.mockClear();
  const connectDB = require("../src/config/db");
  await connectDB();
  return mongoose.__lessons;
}

function insertedPieces(lessons) {
  return lessons.insertMany.mock.calls.flatMap(([docs]) => docs.map((d) => d.piece));
}

describe("db.js seeding: newLessons", () => {
  test("seeds every lesson into an empty collection", async () => {
    mockExistingLessonPieces = [];
    const lessons = await runSeeding();
    const pieces = insertedPieces(lessons);
    expect(pieces).toContain("Pawn - It moves forward only");
    expect(pieces).toContain("Basic Rook Endgames Lucena and Philidor");
    expect(new Set(pieces).size).toBe(pieces.length);
  });

  test("adds corrected names to a collection seeded with old names", async () => {
    // An older seed: a stale name plus a few current ones.
    mockExistingLessonPieces = [
      "Piece Checkmate 1",
      "Pawn - It moves forward only",
      "Bishop - It moves diagonally",
    ];
    const lessons = await runSeeding();
    const pieces = insertedPieces(lessons);
    expect(pieces).toContain("Piece Checkmate 1 Basic checkmates");
    expect(pieces).not.toContain("Pawn - It moves forward only");
    expect(pieces).not.toContain("Bishop - It moves diagonally");
  });

  test("inserts nothing when every lesson already exists", async () => {
    mockExistingLessonPieces = [];
    const first = insertedPieces(await runSeeding());
    mockExistingLessonPieces = first;
    const lessons = await runSeeding();
    expect(lessons.insertMany).not.toHaveBeenCalled();
  });
});
