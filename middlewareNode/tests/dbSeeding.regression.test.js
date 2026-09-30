/**
 * Regression test — db.js's mock-data seeding (seedTestUsers) must never
 * run in a deployed environment (production, staging, qa, or any other
 * non-local NODE_ENV). Issue 5, Phase 6.
 *
 * mongoose is fully mocked so this runs without a real database; the only
 * thing under test is whether the seeding-specific collections get
 * touched at all, not what gets written to them.
 */

jest.mock("mongoose", () => {
  const collectionsRequested = [];
  const fakeCollection = {
    createIndex: jest.fn().mockResolvedValue(undefined),
    countDocuments: jest.fn().mockResolvedValue(0),
    // Simulates a demo student account already existing (e.g. created via
    // seed:dev), so the conditional activities-seeding branch is actually
    // exercised by these tests too, not just the unconditional collections.
    findOne: jest.fn().mockResolvedValue({ _id: "mock-student-id" }),
    insertOne: jest.fn().mockResolvedValue({ insertedId: "mockid" }),
    insertMany: jest.fn().mockResolvedValue({}),
  };
  // seedTestUsers reaches collections via mongoose.connection.db.collection(...)
  const dbCollectionSpy = jest.fn((name) => {
    collectionsRequested.push(name);
    return fakeCollection;
  });
  return {
    connect: jest.fn().mockResolvedValue(undefined),
    connection: {
      db: { collection: dbCollectionSpy },
      // ensureIndexes reaches collections via mongoose.connection.collection(...)
      // directly — kept separate so its index-creation calls (which run
      // regardless of environment) don't pollute the seeding assertions below.
      collection: jest.fn(() => fakeCollection),
    },
    __collectionsRequested: collectionsRequested,
  };
});

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

afterEach(() => {
  process.env.NODE_ENV = ORIGINAL_NODE_ENV;
  jest.resetModules();
});

const SEED_ONLY_COLLECTIONS = ["activityTypes", "activities", "newLessons", "puzzles"];

describe("db.js seeding — deployed-environment gate", () => {
  test.each(["production", "staging", "qa", "prod"])("does NOT seed mock data when NODE_ENV=%s", async (env) => {
    process.env.NODE_ENV = env;
    jest.resetModules();

    const mongoose = require("mongoose");
    const connectDB = require("../src/config/db");
    await connectDB();

    const requested = mongoose.__collectionsRequested;
    for (const name of SEED_ONLY_COLLECTIONS) {
      expect(requested).not.toContain(name);
    }
    expect(mongoose.connect.mock.calls[0][1].serverSelectionTimeoutMS).toBe(10000);
  });

  test.each(["test", "development"])("DOES seed mock data when NODE_ENV=%s (gate isn't inverted)", async (env) => {
    process.env.NODE_ENV = env;
    jest.resetModules();

    const mongoose = require("mongoose");
    const connectDB = require("../src/config/db");
    await connectDB();

    const requested = mongoose.__collectionsRequested;
    for (const name of SEED_ONLY_COLLECTIONS) {
      expect(requested).toContain(name);
    }
    expect(mongoose.connect.mock.calls[0][1].serverSelectionTimeoutMS).toBe(1000);
  });
});
