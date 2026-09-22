/**
 * Unit tests for selectActivities — verifies newly generated daily
 * activities include taskId/route/displayName from activityCatalog, not
 * just name/type/completed.
 */

const mockToArray = jest.fn();
const mockFind = jest.fn(() => ({ toArray: mockToArray }));
const mockCollection = jest.fn(() => ({ find: mockFind }));
const mockDb = jest.fn(() => ({ collection: mockCollection }));
const mockConnect = jest.fn();

jest.mock("mongodb", () => {
  const actual = jest.requireActual("mongodb");
  return {
    ...actual,
    MongoClient: jest.fn().mockImplementation(() => ({
      connect: mockConnect,
      db: mockDb,
    })),
  };
});

jest.mock("config", () => ({ get: jest.fn(() => "mongodb://fake") }));

// utils/activities.js's getDb() checks mongoose.connection.readyState first
// before falling back to the raw MongoClient — force it into the fallback
// path so these tests exercise the mocked MongoClient above.
jest.mock("mongoose", () => ({
  connection: { readyState: 0 },
}));

const { selectActivities } = require("../src/utils/activities");

describe("selectActivities", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockToArray.mockResolvedValue([
      { _id: "captureQueen", type: "puzzle" },
      { _id: "playMatch", type: "match" },
      { _id: "attendSession", type: "mentor" },
      { _id: "performCastle", type: "puzzle" },
      { _id: "capturePawn", type: "puzzle" },
    ]);
  });

  test("returns 4 unique activities", async () => {
    const activities = await selectActivities();
    expect(activities).toHaveLength(4);
    const names = activities.map((a) => a.name);
    expect(new Set(names).size).toBe(4);
  });

  test("every generated activity has taskId, route, and displayName fields", async () => {
    const activities = await selectActivities();
    activities.forEach((activity) => {
      expect(activity).toHaveProperty("taskId");
      expect(activity).toHaveProperty("route");
      expect(activity).toHaveProperty("displayName");
      expect(typeof activity.taskId).toBe("string");
      expect(typeof activity.route).toBe("string");
      expect(typeof activity.displayName).toBe("string");
    });
  });

  test("taskId/route/displayName match the activity catalog for known activities", async () => {
    mockToArray.mockResolvedValue([
      { _id: "captureQueen", type: "puzzle" },
      { _id: "captureRook", type: "puzzle" },
      { _id: "captureKnight", type: "puzzle" },
      { _id: "captureBishop", type: "puzzle" },
    ]);
    const activities = await selectActivities();
    const queenActivity = activities.find((a) => a.name === "captureQueen");
    expect(queenActivity.route).toBe("/puzzles");
    expect(queenActivity.taskId).toBe("captureQueen");
    expect(queenActivity.displayName).toBe("Capture a Queen");
  });

  test("every generated activity starts as incomplete", async () => {
    const activities = await selectActivities();
    activities.forEach((activity) => {
      expect(activity.completed).toBe(false);
    });
  });
});
