/**
 * Integration tests — Leaderboard endpoint
 *
 * Users model, studentStats (chess only now), avatars, and ledgerService
 * are mocked. Uses supertest against a minimal Express app. requireAuth is
 * mocked to always pass through (auth enforcement is covered separately in
 * requireAuth.test.js and leaderboard.security.test.js).
 *
 * Response contract matches LeaderboardModal.tsx:
 *   { success, data: { leaderboard: [{id, rank, username, school_name,
 *     score, avatar_url}], pagination: { has_more } } }
 *
 * `score` comes from ledgerService.getLifetimeEarnedMap (currency rollout
 * swap — see routes/leaderboard.js's module header) rather than the old
 * time/streak/badge/activity weighted formula. Chess record stays a
 * separate stat via studentStats.getChessRecords, untouched by this swap.
 *
 * Endpoints tested: GET /leaderboard, GET /leaderboard/schools
 */

jest.mock("../src/middleware/requireAuth", () => (req, _res, next) => {
  req.user = { username: "alice", role: "student" };
  next();
});

jest.mock("../src/models/users");
jest.mock("../src/utils/studentStats");
jest.mock("../src/utils/avatars");
jest.mock("../src/services/ledgerService");

const express = require("express");
const request = require("supertest");
const requireAuth = require("../src/middleware/requireAuth");
const leaderboard = require("../src/routes/leaderboard");
const Users = require("../src/models/users");
const studentStats = require("../src/utils/studentStats");
const { getAvatarUrl } = require("../src/utils/avatars");
const ledgerService = require("../src/services/ledgerService");

const app = express();
app.use(express.json());
app.use("/leaderboard", requireAuth, leaderboard);

afterEach(() => jest.clearAllMocks());

const STUDENTS = [
  { _id: "1", username: "alice", country: "USA", state: "FL", school: "Jefferson Middle" },
  { _id: "2", username: "bob", country: "USA", state: "GA", school: "Pine View School" },
  { _id: "3", username: "carol", country: "Canada", state: null, school: null },
];

/**
 * Sets up ledgerService.getLifetimeEarnedMap to return the given
 * score for each username (looked up by _id, matching real usage) and
 * studentStats.getChessRecords for chess data — chess stays a completely
 * separate, unaffected mock from the currency-score swap.
 */
function mockScoresFor(scoreByUsername, students = STUDENTS) {
  const byId = new Map(students.map((s) => [String(s._id), scoreByUsername[s.username]?.score ?? 0]));
  ledgerService.getLifetimeEarnedMap.mockImplementation(async (userIds) => {
    const map = new Map();
    for (const id of userIds) {
      const key = String(id);
      if (byId.has(key)) map.set(key, byId.get(key));
    }
    return map;
  });
  // Chess record is a separate stat, batched for the whole page.
  studentStats.getChessRecords.mockImplementation(
    async (usernames) =>
      new Map(
        usernames.map((u) => [
          u,
          scoreByUsername[u]?.chess || {
            wins: 0,
            draws: 0,
            losses: 0,
            gamesPlayed: 0,
            chessScore: 0,
          },
        ])
      )
  );
}

describe("GET /leaderboard", () => {
  beforeEach(() => {
    Users.find.mockResolvedValue(STUDENTS);
    getAvatarUrl.mockImplementation((avatarKey) =>
      avatarKey ? `https://s3.example.com/${avatarKey}` : null
    );
    mockScoresFor({
      alice: { score: 87 },
      bob: { score: 41 },
      carol: { score: 3 },
    });
  });

  test("200 — returns entries with the exact shape LeaderboardModal expects", async () => {
    const res = await request(app).get("/leaderboard");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("leaderboard");
    expect(res.body.data).toHaveProperty("pagination");
    expect(res.body.data.pagination).toHaveProperty("has_more");
    const first = res.body.data.leaderboard[0];
    expect(first).toHaveProperty("id");
    expect(first).toHaveProperty("rank");
    expect(first).toHaveProperty("username");
    expect(first).toHaveProperty("school_name");
    expect(first).toHaveProperty("score");
    expect(first).toHaveProperty("avatar_url", null);
  });

  test("returns a presigned avatar_url when the student has an avatarKey", async () => {
    Users.find.mockResolvedValue([
      { _id: "1", username: "dave", school: "Test School", avatarKey: "dave/abc123.png" },
    ]);
    const res = await request(app).get("/leaderboard");
    expect(res.body.data.leaderboard[0].avatar_url).toBe("https://s3.example.com/dave/abc123.png");
    expect(getAvatarUrl).toHaveBeenCalledWith("dave/abc123.png");
  });

  test("returns null avatar_url when the student has no avatarKey", async () => {
    Users.find.mockResolvedValue([
      { _id: "1", username: "eve", school: "Test School", avatarKey: null },
    ]);
    const res = await request(app).get("/leaderboard");
    expect(res.body.data.leaderboard[0].avatar_url).toBeNull();
  });

  test("does not include firstName/PII fields in response", async () => {
    const res = await request(app).get("/leaderboard");
    expect(res.body.data.leaderboard[0]).not.toHaveProperty("firstName");
    expect(res.body.data.leaderboard[0]).not.toHaveProperty("lastName");
    expect(res.body.data.leaderboard[0]).not.toHaveProperty("email");
  });

  test("default sort: ranked by score descending", async () => {
    const res = await request(app).get("/leaderboard");
    const scores = res.body.data.leaderboard.map((e) => e.score);
    const sorted = [...scores].sort((a, b) => b - a);
    expect(scores).toEqual(sorted);
    expect(res.body.data.leaderboard[0].username).toBe("alice"); // highest score
  });

  test("sortBy=name sorts alphabetically", async () => {
    const res = await request(app).get("/leaderboard?sortBy=name&sortDir=asc");
    const names = res.body.data.leaderboard.map((e) => e.username);
    expect(names).toEqual(["alice", "bob", "carol"]);
  });

  test("sortDir=asc reverses score order", async () => {
    const res = await request(app).get("/leaderboard?sortBy=score&sortDir=asc");
    expect(res.body.data.leaderboard[0].username).toBe("carol"); // lowest score
  });

  test("rank is 1-indexed and sequential", async () => {
    const res = await request(app).get("/leaderboard");
    res.body.data.leaderboard.forEach((entry, idx) => {
      expect(entry.rank).toBe(idx + 1);
    });
  });

  test("filters by school", async () => {
    await request(app).get("/leaderboard?school=Jefferson Middle");
    expect(Users.find).toHaveBeenCalledWith(
      expect.objectContaining({ role: "student", school: "Jefferson Middle" }),
      expect.anything()
    );
  });

  test("filters by country (additive, not used by current UI)", async () => {
    await request(app).get("/leaderboard?country=USA");
    expect(Users.find).toHaveBeenCalledWith(
      expect.objectContaining({ role: "student", country: "USA" }),
      expect.anything()
    );
  });

  test("search matches username case-insensitively via a Mongo $regex filter", async () => {
    await request(app).get("/leaderboard?search=ALI");
    const filterArg = Users.find.mock.calls[0][0];
    expect(filterArg.username.$options).toBe("i");
    expect(new RegExp(filterArg.username.$regex, "i").test("alice")).toBe(true);
  });

  test("search input is regex-escaped (no ReDoS via metacharacters)", async () => {
    await request(app).get("/leaderboard?search=" + encodeURIComponent("a(b|c)*"));
    const filterArg = Users.find.mock.calls[0][0];
    const pattern = new RegExp(filterArg.username.$regex, "i");
    // The literal string should NOT be interpreted as alternation/repetition
    expect(pattern.test("a(b|c)*")).toBe(true);
    expect(pattern.test("ab")).toBe(false);
  });

  test("does not use regex for country/state/school (exact match only)", async () => {
    await request(app).get("/leaderboard?school=Jefferson Middle");
    const filterArg = Users.find.mock.calls[0][0];
    expect(filterArg.school).toBe("Jefferson Middle");
    expect(filterArg.school).not.toBeInstanceOf(RegExp);
  });

  test("pagination — limit restricts entry count", async () => {
    const res = await request(app).get("/leaderboard?limit=2");
    expect(res.body.data.leaderboard.length).toBeLessThanOrEqual(2);
  });

  test("pagination — page offsets results", async () => {
    const page1 = await request(app).get("/leaderboard?limit=1&page=1");
    const page2 = await request(app).get("/leaderboard?limit=1&page=2");
    expect(page2.body.data.leaderboard[0].username).not.toBe(page1.body.data.leaderboard[0].username);
  });

  test("pagination — has_more is true when more results exist", async () => {
    const res = await request(app).get("/leaderboard?limit=1");
    expect(res.body.data.pagination.has_more).toBe(true);
  });

  test("pagination — has_more is false on last page", async () => {
    const res = await request(app).get("/leaderboard?limit=10");
    expect(res.body.data.pagination.has_more).toBe(false);
  });

  test("limit is capped at 100", async () => {
    Users.find.mockResolvedValue(
      Array.from({ length: 150 }, (_, i) => ({
        _id: String(i),
        username: `user${i}`,
        school: "Test School",
      }))
    );
    ledgerService.getLifetimeEarnedMap.mockResolvedValue(new Map());
    studentStats.getChessRecords.mockImplementation(async (usernames) => new Map(usernames.map((u) => [u, { wins: 0, draws: 0, losses: 0, gamesPlayed: 0, chessScore: 0 }])));
    const res = await request(app).get("/leaderboard?limit=500");
    expect(res.body.data.leaderboard.length).toBeLessThanOrEqual(100);
  });

  test("EDGE-06 — unfiltered candidate set is capped at MAX_UNFILTERED_CANDIDATES (500)", async () => {
    Users.find.mockResolvedValue(
      Array.from({ length: 800 }, (_, i) => ({
        _id: String(i),
        username: `user${i}`,
        school: "Test School",
      }))
    );
    ledgerService.getLifetimeEarnedMap.mockResolvedValue(new Map());
    studentStats.getChessRecords.mockImplementation(async (usernames) => new Map(usernames.map((u) => [u, { wins: 0, draws: 0, losses: 0, gamesPlayed: 0, chessScore: 0 }])));
    // No filters applied — unfiltered path should cap candidates before scoring.
    const res = await request(app).get("/leaderboard?limit=100&page=8"); // page 8 * 100 = would need 800 candidates
    // Total reported can never exceed the 500-candidate cap, regardless of
    // how many students actually exist in the collection.
    expect(res.body.data.leaderboard.length).toBeLessThanOrEqual(100);
    const lastPossiblePage = Math.ceil(500 / 100);
    const beyondCapRes = await request(app).get(`/leaderboard?limit=100&page=${lastPossiblePage + 1}`);
    expect(beyondCapRes.body.data.leaderboard).toHaveLength(0);
  });

  test("EDGE-06 — a filtered query is NOT capped at 500 (filter narrows before scoring)", async () => {
    Users.find.mockResolvedValue(
      Array.from({ length: 600 }, (_, i) => ({
        _id: String(i),
        username: `user${i}`,
        school: "Big School",
      }))
    );
    ledgerService.getLifetimeEarnedMap.mockResolvedValue(new Map());
    studentStats.getChessRecords.mockImplementation(async (usernames) => new Map(usernames.map((u) => [u, { wins: 0, draws: 0, losses: 0, gamesPlayed: 0, chessScore: 0 }])));
    // Page size is still capped at MAX_LIMIT (100) regardless of filtering,
    // but the underlying candidate set for a filtered query is NOT capped
    // at 500 — walk to the last page and confirm has_more only goes false
    // once all 600 have been paged through, not at the unfiltered 500 cap.
    const lastPage = await request(app).get("/leaderboard?school=Big School&limit=100&page=6");
    expect(lastPage.body.data.leaderboard).toHaveLength(100); // 501-600 present, i.e. not capped
    expect(lastPage.body.data.pagination.has_more).toBe(false);

    const beyondRes = await request(app).get("/leaderboard?school=Big School&limit=100&page=7");
    expect(beyondRes.body.data.leaderboard).toHaveLength(0);
  });

  test("EDGE-08 — a student with zero activity appears with score 0, not omitted", async () => {
    Users.find.mockResolvedValue([
      { _id: "1", username: "quiet", school: "Test School" },
    ]);
    ledgerService.getLifetimeEarnedMap.mockResolvedValue(new Map());
    studentStats.getChessRecords.mockImplementation(async (usernames) => new Map(usernames.map((u) => [u, { wins: 0, draws: 0, losses: 0, gamesPlayed: 0, chessScore: 0 }]))); // no entry for "quiet" -> all stats default to 0
    const res = await request(app).get("/leaderboard");
    expect(res.status).toBe(200);
    expect(res.body.data.leaderboard).toHaveLength(1);
    expect(res.body.data.leaderboard[0].username).toBe("quiet");
    expect(res.body.data.leaderboard[0].score).toBe(0);
  });

  test("200 — returns empty leaderboard when no students match filter", async () => {
    Users.find.mockResolvedValue([]);
    const res = await request(app).get("/leaderboard?school=Nonexistent School");
    expect(res.status).toBe(200);
    expect(res.body.data.leaderboard).toHaveLength(0);
    expect(res.body.data.pagination.has_more).toBe(false);
  });

  test("500 — returns server error when Users.find throws", async () => {
    Users.find.mockRejectedValue(new Error("DB connection failed"));
    const res = await request(app).get("/leaderboard");
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });

  test("students with null school are handled without crashing", async () => {
    const res = await request(app).get("/leaderboard");
    const carolEntry = res.body.data.leaderboard.find((e) => e.username === "carol");
    expect(carolEntry.school_name).toBeNull();
  });
});

describe("GET /leaderboard/schools", () => {
  test("200 — returns distinct non-empty school list", async () => {
    Users.distinct.mockResolvedValue(["Jefferson Middle", "Pine View School"]);
    const res = await request(app).get("/leaderboard/schools");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, schools: ["Jefferson Middle", "Pine View School"] });
  });

  test("queries with role:student and excludes empty/null schools", async () => {
    Users.distinct.mockResolvedValue([]);
    await request(app).get("/leaderboard/schools");
    expect(Users.distinct).toHaveBeenCalledWith(
      "school",
      expect.objectContaining({ role: "student", school: { $nin: ["", null] } })
    );
  });

  test("500 — returns server error when Users.distinct throws", async () => {
    Users.distinct.mockRejectedValue(new Error("DB error"));
    const res = await request(app).get("/leaderboard/schools");
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

describe("GET /leaderboard/countries", () => {
  test("200 — returns distinct non-empty country list", async () => {
    Users.distinct.mockResolvedValue(["USA", "Canada"]);
    const res = await request(app).get("/leaderboard/countries");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, countries: ["USA", "Canada"] });
  });

  test("queries with role:student and excludes empty/null countries", async () => {
    Users.distinct.mockResolvedValue([]);
    await request(app).get("/leaderboard/countries");
    expect(Users.distinct).toHaveBeenCalledWith(
      "country",
      expect.objectContaining({ role: "student", country: { $nin: ["", null] } })
    );
  });

  test("500 — returns server error when Users.distinct throws", async () => {
    Users.distinct.mockRejectedValue(new Error("DB error"));
    const res = await request(app).get("/leaderboard/countries");
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

describe("GET /leaderboard/states", () => {
  test("200 — returns distinct non-empty state list", async () => {
    Users.distinct.mockResolvedValue(["FL", "GA"]);
    const res = await request(app).get("/leaderboard/states");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, states: ["FL", "GA"] });
  });

  test("queries with role:student and excludes empty/null states", async () => {
    Users.distinct.mockResolvedValue([]);
    await request(app).get("/leaderboard/states");
    expect(Users.distinct).toHaveBeenCalledWith(
      "state",
      expect.objectContaining({ role: "student", state: { $nin: ["", null] } })
    );
  });

  test("500 — returns server error when Users.distinct throws", async () => {
    Users.distinct.mockRejectedValue(new Error("DB error"));
    const res = await request(app).get("/leaderboard/states");
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

describe("GET /leaderboard — country/state now included in entry response", () => {
  test("entries include country and state fields", async () => {
    const singleStudent = [{ _id: "1", username: "alice", country: "USA", state: "FL", school: "Jefferson Middle" }];
    Users.find.mockResolvedValue(singleStudent);
    mockScoresFor({ alice: { score: 5 } }, singleStudent);
    const res = await request(app).get("/leaderboard");
    expect(res.body.data.leaderboard[0]).toMatchObject({ country: "USA", state: "FL" });
  });

  test("country/state filter combined with school filter (AND semantics)", async () => {
    Users.find.mockResolvedValue([]);
    await request(app).get("/leaderboard?country=USA&state=FL&school=Jefferson Middle");
    expect(Users.find).toHaveBeenCalledWith(
      expect.objectContaining({ role: "student", country: "USA", state: "FL", school: "Jefferson Middle" }),
      expect.anything()
    );
  });
});

// ─── Chess results are a SEPARATE stat ───────────────────────────
//
// The whole point of the agreed design: engagement score and competitive
// score stay two numbers. These tests fail loudly if anyone folds one into
// the other.

describe("GET /leaderboard — chess record as its own column", () => {
  const CHESS = { wins: 4, draws: 2, losses: 1, gamesPlayed: 7, chessScore: 14 };

  test("entries carry chess_score and chess_record alongside score", async () => {
    const singleStudent = [{ _id: "1", username: "alice", country: "USA", state: "FL", school: "Jefferson Middle" }];
    Users.find.mockResolvedValue(singleStudent);
    mockScoresFor({ alice: { score: 5, chess: CHESS } }, singleStudent);

    const res = await request(app).get("/leaderboard");
    const entry = res.body.data.leaderboard[0];
    expect(entry.chess_score).toBe(14);
    expect(entry.chess_record).toEqual({ wins: 4, draws: 2, losses: 1, gamesPlayed: 7 });
  });

  test("chess results do NOT change the currency score", async () => {
    const singleStudent = [{ _id: "1", username: "alice", country: "USA", state: "FL", school: "Jefferson Middle" }];
    Users.find.mockResolvedValue(singleStudent);

    mockScoresFor({ alice: { score: 20 } }, singleStudent); // no games
    const without = await request(app).get("/leaderboard");
    const scoreWithoutGames = without.body.data.leaderboard[0].score;

    mockScoresFor({ alice: { score: 20, chess: CHESS } }, singleStudent); // same currency score, many wins
    const with_ = await request(app).get("/leaderboard");
    const entry = with_.body.data.leaderboard[0];

    expect(entry.score).toBe(scoreWithoutGames);
    expect(entry.chess_score).toBe(14);
  });

  test("a student with no games shows a zeroed record, not a missing column", async () => {
    const singleStudent = [{ _id: "3", username: "carol", school: null }];
    Users.find.mockResolvedValue(singleStudent);
    mockScoresFor({ carol: { score: 0 } }, singleStudent);

    const entry = (await request(app).get("/leaderboard")).body.data.leaderboard[0];
    expect(entry.chess_score).toBe(0);
    expect(entry.chess_record).toEqual({ wins: 0, draws: 0, losses: 0, gamesPlayed: 0 });
  });

  test("sortBy=chess ranks by chess score, independent of currency score", async () => {
    Users.find.mockResolvedValue(STUDENTS);
    mockScoresFor({
      // alice leads on currency score, bob leads on chess.
      alice: { score: 100, chess: { wins: 0, draws: 0, losses: 3, gamesPlayed: 3, chessScore: 0 } },
      bob: { score: 1, chess: { wins: 9, draws: 0, losses: 0, gamesPlayed: 9, chessScore: 27 } },
      carol: { score: 0, chess: { wins: 1, draws: 0, losses: 0, gamesPlayed: 1, chessScore: 3 } },
    });

    const byChess = await request(app).get("/leaderboard?sortBy=chess");
    expect(byChess.body.data.leaderboard.map((e) => e.username)).toEqual(["bob", "carol", "alice"]);

    const byScore = await request(app).get("/leaderboard");
    expect(byScore.body.data.leaderboard[0].username).toBe("alice");
  });
});
