/**
 * Integration tests — Streak API
 * Maps to test plan §6 EDGE-05 (UTC day-boundary streak calculation) and
 * general contract coverage for GET /streak and GET /streak/calendar.
 */

jest.mock("../src/models/timeTracking");
jest.mock("../src/middleware/requireAuth", () => (req, _res, next) => {
  req.user = { username: req.query?.username || "alice", role: "student" };
  next();
});

const express = require("express");
const request = require("supertest");
const streakRoute = require("../src/routes/streak");
const TimeTracking = require("../src/models/timeTracking");

const app = express();
app.use(express.json());
app.use("/streak", streakRoute);

afterEach(() => jest.clearAllMocks());

function ev(eventType, isoDate) {
  return { eventType, startTime: new Date(isoDate) };
}

describe("GET /streak", () => {
  test("400 when username is missing", async () => {
    const res = await request(app).get("/streak");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/username/i);
  });

  test("returns zeros for a user with no events", async () => {
    TimeTracking.find.mockReturnValue({ lean: () => Promise.resolve([]) });
    const res = await request(app).get("/streak?username=newuser");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ currentStreak: 0, longestStreak: 0, lastCompletedDate: null });
  });

  test("a day with only lesson (no puzzle) does not count as completed", async () => {
    TimeTracking.find.mockReturnValue({
      lean: () => Promise.resolve([ev("lesson", "2026-07-01T10:00:00Z")]),
    });
    const res = await request(app).get("/streak?username=alice");
    expect(res.body.currentStreak).toBe(0);
    expect(res.body.lastCompletedDate).toBeNull();
  });

  test("consecutive completed days produce a matching currentStreak", async () => {
    TimeTracking.find.mockReturnValue({
      lean: () =>
        Promise.resolve([
          ev("lesson", "2026-07-01T10:00:00Z"), ev("puzzle", "2026-07-01T11:00:00Z"),
          ev("lesson", "2026-07-02T10:00:00Z"), ev("puzzle", "2026-07-02T11:00:00Z"),
          ev("lesson", "2026-07-03T10:00:00Z"), ev("puzzle", "2026-07-03T11:00:00Z"),
        ]),
    });
    const res = await request(app).get("/streak?username=alice");
    expect(res.body.currentStreak).toBe(3);
    expect(res.body.longestStreak).toBe(3);
    expect(res.body.lastCompletedDate).toBe("2026-07-03");
  });

  test("known behavior — a day with zero recorded events is invisible to the algorithm, not treated as a gap", async () => {
    // dayCompleted/allDates only ever iterates days that have AT LEAST ONE
    // event; a day with no events isn't in daysMap at all, so it can't
    // break a run the way a calendar-aware implementation would expect.
    // This mirrors the identical, intentional behavior documented for
    // studentStats.getUserStreak — flagging it here again for /streak
    // specifically since it's a separate implementation of the same idea.
    TimeTracking.find.mockReturnValue({
      lean: () =>
        Promise.resolve([
          ev("lesson", "2026-07-01T10:00:00Z"), ev("puzzle", "2026-07-01T11:00:00Z"),
          ev("lesson", "2026-07-02T10:00:00Z"), ev("puzzle", "2026-07-02T11:00:00Z"),
          // July 3 has no events at all — NOT a break in this algorithm
          ev("lesson", "2026-07-04T10:00:00Z"), ev("puzzle", "2026-07-04T11:00:00Z"),
        ]),
    });
    const res = await request(app).get("/streak?username=alice");
    expect(res.body.longestStreak).toBe(3); // 07-01, 07-02, 07-04 chain uninterrupted
    expect(res.body.currentStreak).toBe(3);
  });

  test("a day with only lesson (real incomplete day, present in the data) correctly breaks the run", async () => {
    TimeTracking.find.mockReturnValue({
      lean: () =>
        Promise.resolve([
          ev("lesson", "2026-07-01T10:00:00Z"), ev("puzzle", "2026-07-01T11:00:00Z"),
          ev("lesson", "2026-07-02T10:00:00Z"), // incomplete — puzzle missing
          ev("lesson", "2026-07-03T10:00:00Z"), ev("puzzle", "2026-07-03T11:00:00Z"),
        ]),
    });
    const res = await request(app).get("/streak?username=alice");
    expect(res.body.longestStreak).toBe(1); // 07-01 alone; 07-02 breaks it before 07-03 starts fresh
    expect(res.body.currentStreak).toBe(1); // only 07-03
  });

  test("EDGE-05 — events straddling the UTC midnight boundary land in distinct day buckets", async () => {
    TimeTracking.find.mockReturnValue({
      lean: () =>
        Promise.resolve([
          ev("lesson", "2026-07-01T23:58:00Z"),
          ev("puzzle", "2026-07-01T23:59:00Z"),
          ev("lesson", "2026-07-02T00:02:00Z"),
          ev("puzzle", "2026-07-02T00:05:00Z"),
        ]),
    });
    const res = await request(app).get("/streak?username=alice");
    // Two distinct completed days (07-01 and 07-02), not merged into one,
    // and not miscounted as zero because the pairing crosses midnight.
    expect(res.body.currentStreak).toBe(2);
    expect(res.body.lastCompletedDate).toBe("2026-07-02");
  });

  test("events with missing startTime or eventType are skipped, not crashing", async () => {
    TimeTracking.find.mockReturnValue({
      lean: () =>
        Promise.resolve([
          { eventType: "lesson" }, // no startTime
          { startTime: new Date("2026-07-01T10:00:00Z") }, // no eventType
          ev("lesson", "2026-07-01T10:00:00Z"),
          ev("puzzle", "2026-07-01T11:00:00Z"),
        ]),
    });
    const res = await request(app).get("/streak?username=alice");
    expect(res.status).toBe(200);
    expect(res.body.currentStreak).toBe(1);
  });

  test("500 on unexpected DB error", async () => {
    TimeTracking.find.mockImplementation(() => {
      throw new Error("DB down");
    });
    const res = await request(app).get("/streak?username=alice");
    expect(res.status).toBe(500);
  });
});

describe("GET /streak/calendar", () => {
  test("400 when username or month is missing", async () => {
    const res1 = await request(app).get("/streak/calendar?username=alice");
    expect(res1.status).toBe(400);
    const res2 = await request(app).get("/streak/calendar?month=2026-07");
    expect(res2.status).toBe(400);
  });

  test("returns per-day completed flags for the requested month only", async () => {
    TimeTracking.find.mockReturnValue({
      lean: () =>
        Promise.resolve([
          ev("lesson", "2026-07-05T10:00:00Z"),
          ev("puzzle", "2026-07-05T11:00:00Z"),
          ev("lesson", "2026-07-06T10:00:00Z"), // incomplete day
        ]),
    });
    const res = await request(app).get("/streak/calendar?username=alice&month=2026-07");
    expect(res.status).toBe(200);
    const day5 = res.body.days.find((d) => d.date === "2026-07-05");
    const day6 = res.body.days.find((d) => d.date === "2026-07-06");
    expect(day5.completed).toBe(true);
    expect(day6.completed).toBe(false);
  });

  test("queries TimeTracking with a date range scoped to the requested month", async () => {
    const findMock = jest.fn().mockReturnValue({ lean: () => Promise.resolve([]) });
    TimeTracking.find.mockImplementation(findMock);

    await request(app).get("/streak/calendar?username=alice&month=2026-07");

    const filterArg = findMock.mock.calls[0][0];
    expect(filterArg.username).toBe("alice");
    expect(filterArg.startTime.$gte.toISOString().slice(0, 7)).toBe("2026-07");
    expect(filterArg.startTime.$lt.toISOString().slice(0, 7)).toBe("2026-08");
  });
});
