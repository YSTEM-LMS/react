/**
 * Comprehensive Security & Route Authorization Regression Tests
 *
 * Validates that all sensitive endpoints in middlewareNode strictly enforce:
 * 1. Authentication (401 Unauthorized when unauthenticated / missing JWT)
 * 2. Role-Based Access Control (403 Forbidden for insufficient roles)
 * 3. Resource Ownership & Identity Verification (403 Forbidden for cross-user resource access)
 * 4. Legitimate Authenticated Access (200 / 201 when authenticated with valid permissions)
 * 5. Intentionally Public Content Routes (200 OK without token)
 */

let mockAuthUser = null;

jest.mock("passport", () => ({
  authenticate: jest.fn((strategy, options, callback) => {
    return (req, res, next) => {
      if (typeof options === "function") {
        callback = options;
      }
      if (callback) {
        if (!mockAuthUser) return callback(null, false);
        return callback(null, mockAuthUser);
      }
      if (!mockAuthUser) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      req.user = mockAuthUser;
      next();
    };
  }),
  initialize: () => (req, res, next) => next(),
  session: () => (req, res, next) => next(),
  serializeUser: () => {},
  deserializeUser: () => {},
  use: () => {},
}));

jest.mock("../src/models/ChatSession");
jest.mock("../src/models/ChatMessage");
jest.mock("../src/models/CoachTemplate");
jest.mock("../src/models/Guardrail");
jest.mock("../src/models/meetings");
jest.mock("../src/models/moves");
jest.mock("../src/models/undoPermission");
jest.mock("../src/models/users");
jest.mock("../src/models/timeTracking");
jest.mock("../src/models/puzzles");
jest.mock("../src/models/categorys");

const express = require("express");
const request = require("supertest");

const chatRouter = require("../src/routes/chat");
const meetingsRouter = require("../src/routes/meetings");
const challengeRouter = require("../src/routes/challenge");
const activitiesRouter = require("../src/routes/activities");
const usersRouter = require("../src/routes/users");
const streakRouter = require("../src/routes/streak");
const badgesRouter = require("../src/routes/badges");
const puzzlesRouter = require("../src/routes/puzzles");
const categorysRouter = require("../src/routes/categorys");
const authRouter = require("../src/routes/auth");

const ChatSession = require("../src/models/ChatSession");
const ChatMessage = require("../src/models/ChatMessage");
const CoachTemplate = require("../src/models/CoachTemplate");
const meetings = require("../src/models/meetings");
const movesList = require("../src/models/moves");
const undoPermission = require("../src/models/undoPermission");
const users = require("../src/models/users");
const TimeTracking = require("../src/models/timeTracking");
const puzzles = require("../src/models/puzzles");
const categorys = require("../src/models/categorys");

const app = express();
app.use(express.json());

app.use("/chat", chatRouter);
app.use("/meetings", meetingsRouter);
app.use("/challenge", challengeRouter);
app.use("/activities", activitiesRouter);
app.use("/user", usersRouter);
app.use("/streak", streakRouter);
app.use("/badges", badgesRouter);
app.use("/puzzles", puzzlesRouter);
app.use("/category", categorysRouter);
app.use("/auth", authRouter);

describe("Security Audit Regression: Unauthenticated Access Control (401 Unauthorized)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthUser = null; // Unauthenticated
  });

  describe("Chat Endpoints (/chat/*)", () => {
    test("GET /chat/metrics -> 401 when unauthenticated", async () => {
      const res = await request(app).get("/chat/metrics");
      expect(res.status).toBe(401);
    });

    test("GET /chat/educator/sessions -> 401 when unauthenticated", async () => {
      const res = await request(app).get("/chat/educator/sessions");
      expect(res.status).toBe(401);
    });

    test("GET /chat/educator/session/:sessionId/transcript -> 401 when unauthenticated", async () => {
      const res = await request(app).get("/chat/educator/session/test-session-1/transcript");
      expect(res.status).toBe(401);
    });

    test("POST /chat/session -> 401 when unauthenticated", async () => {
      const res = await request(app).post("/chat/session").send({ userId: "student1", topic: "math" });
      expect(res.status).toBe(401);
    });

    test("GET /chat/sessions -> 401 when unauthenticated", async () => {
      const res = await request(app).get("/chat/sessions?userId=student1");
      expect(res.status).toBe(401);
    });

    test("GET /chat/session/:sessionId -> 401 when unauthenticated", async () => {
      const res = await request(app).get("/chat/session/test-session-1");
      expect(res.status).toBe(401);
    });

    test("POST /chat/message -> 401 when unauthenticated", async () => {
      const res = await request(app).post("/chat/message").send({ sessionId: "test-session-1", message: "hello" });
      expect(res.status).toBe(401);
    });

    test("POST /chat/session/:sessionId/end -> 401 when unauthenticated", async () => {
      const res = await request(app).post("/chat/session/test-session-1/end");
      expect(res.status).toBe(401);
    });

    test("POST /chat/chess-feedback -> 401 when unauthenticated", async () => {
      const res = await request(app).post("/chat/chess-feedback").send({ moveUci: "e2e4" });
      expect(res.status).toBe(401);
    });
  });

  describe("Meetings Move Storage Endpoints (/meetings/*)", () => {
    test("POST /meetings/storeMoves -> 401 when unauthenticated", async () => {
      const res = await request(app).post("/meetings/storeMoves?gameId=g1&fen=fen1");
      expect(res.status).toBe(401);
    });

    test("POST /meetings/newGameStoreMoves -> 401 when unauthenticated", async () => {
      const res = await request(app).post("/meetings/newGameStoreMoves?gameId=g1");
      expect(res.status).toBe(401);
    });

    test("GET /meetings/getStoreMoves -> 401 when unauthenticated", async () => {
      const res = await request(app).get("/meetings/getStoreMoves?gameId=g1");
      expect(res.status).toBe(401);
    });

    test("POST /meetings/checkUndoPermission -> 401 when unauthenticated", async () => {
      const res = await request(app).post("/meetings/checkUndoPermission?meetingId=m1");
      expect(res.status).toBe(401);
    });

    test("POST /meetings/undoMeetingMoves -> 401 when unauthenticated", async () => {
      const res = await request(app).post("/meetings/undoMeetingMoves?meetingId=m1");
      expect(res.status).toBe(401);
    });

    test("POST /meetings/undoMoves -> 401 when unauthenticated", async () => {
      const res = await request(app).post("/meetings/undoMoves?gameId=g1");
      expect(res.status).toBe(401);
    });
  });

  describe("Challenge Matchmaking Endpoints (/challenge/*)", () => {
    test("POST /challenge -> 401 when unauthenticated", async () => {
      const res = await request(app).post("/challenge").send({ fromUsername: "alice", toUsername: "bob" });
      expect(res.status).toBe(401);
    });

    test("GET /challenge/incoming/:username -> 401 when unauthenticated", async () => {
      const res = await request(app).get("/challenge/incoming/alice");
      expect(res.status).toBe(401);
    });

    test("GET /challenge/:id -> 401 when unauthenticated", async () => {
      const res = await request(app).get("/challenge/some-id");
      expect(res.status).toBe(401);
    });

    test("POST /challenge/:id/accept -> 401 when unauthenticated", async () => {
      const res = await request(app).post("/challenge/some-id/accept");
      expect(res.status).toBe(401);
    });

    test("POST /challenge/:id/decline -> 401 when unauthenticated", async () => {
      const res = await request(app).post("/challenge/some-id/decline");
      expect(res.status).toBe(401);
    });
  });

  describe("Activity & User Lookup Endpoints", () => {
    test("GET /activities/:username -> 401 when unauthenticated", async () => {
      const res = await request(app).get("/activities/alice");
      expect(res.status).toBe(401);
    });

    test("GET /activities/:username/dates -> 401 when unauthenticated", async () => {
      const res = await request(app).get("/activities/alice/dates");
      expect(res.status).toBe(401);
    });

    test("PUT /activities/:username/activity -> 401 when unauthenticated", async () => {
      const res = await request(app).put("/activities/alice/activity").send({ activityName: "puzzle1" });
      expect(res.status).toBe(401);
    });

    test("GET /user/getStudent -> 401 when unauthenticated", async () => {
      const res = await request(app).get("/user/getStudent");
      expect(res.status).toBe(401);
    });

    test("GET /user/getUser -> 401 when unauthenticated", async () => {
      const res = await request(app).get("/user/getUser?username=alice");
      expect(res.status).toBe(401);
    });

    test("GET /user/mentorless -> 401 when unauthenticated", async () => {
      const res = await request(app).get("/user/mentorless");
      expect(res.status).toBe(401);
    });

    test("GET /streak -> 401 when unauthenticated", async () => {
      const res = await request(app).get("/streak?username=alice");
      expect(res.status).toBe(401);
    });

    test("GET /streak/calendar -> 401 when unauthenticated", async () => {
      const res = await request(app).get("/streak/calendar?username=alice&month=2026-08");
      expect(res.status).toBe(401);
    });
  });
});

describe("Security Audit Regression: Role & Ownership Authorization (403 Forbidden)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("403 — Non-admin/non-tutor (student) cannot access /chat/metrics", async () => {
    mockAuthUser = { _id: "u1", username: "student1", role: "student" };
    const res = await request(app).get("/chat/metrics");
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/admin or tutor/i);
  });

  test("403 — Non-admin/non-tutor (student) cannot access /chat/educator/sessions", async () => {
    mockAuthUser = { _id: "u1", username: "student1", role: "student" };
    const res = await request(app).get("/chat/educator/sessions");
    expect(res.status).toBe(403);
  });

  test("403 — Student cannot create a chat session for a different userId", async () => {
    mockAuthUser = { _id: "u1", username: "student1", role: "student" };
    const res = await request(app).post("/chat/session").send({ userId: "student2", topic: "math" });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/cannot create session for another user/i);
  });

  test("403 — Student cannot read historical sessions belonging to another user", async () => {
    mockAuthUser = { _id: "u1", username: "student1", role: "student" };
    const res = await request(app).get("/chat/sessions?userId=student2");
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/cannot access another user's sessions/i);
  });

  test("403 — Student cannot view details/messages of another user's chat session", async () => {
    mockAuthUser = { _id: "u1", username: "student1", role: "student" };
    ChatSession.findById.mockResolvedValue({
      _id: "s2",
      userId: "u2_other_user",
      topic: "math",
      status: "active",
    });

    const res = await request(app).get("/chat/session/s2");
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/cannot access another user's session/i);
  });

  test("403 — Student cannot post messages to another user's chat session", async () => {
    mockAuthUser = { _id: "u1", username: "student1", role: "student" };
    ChatSession.findById.mockResolvedValue({
      _id: "s2",
      userId: "u2_other_user",
      status: "active",
    });

    const res = await request(app).post("/chat/message").send({ sessionId: "s2", message: "hi" });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/cannot send message to another user's session/i);
  });

  test("403 — Student cannot create a challenge claiming to be someone else (fromUsername mismatch)", async () => {
    mockAuthUser = { _id: "u1", username: "alice", role: "student" };
    const res = await request(app).post("/challenge").send({ fromUsername: "bob", toUsername: "charlie" });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/cannot create challenge for another user/i);
  });

  test("403 — Student cannot read incoming challenges of another user", async () => {
    mockAuthUser = { _id: "u1", username: "alice", role: "student" };
    const res = await request(app).get("/challenge/incoming/bob");
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/cannot read another user's challenges/i);
  });

  test("403 — Non-participant cannot inspect an existing challenge", async () => {
    mockAuthUser = { _id: "u1", username: "alice", role: "student" };
    // Create challenge between alice and bob first
    challengeRouter._reset();
    const createRes = await request(app).post("/challenge").send({ fromUsername: "alice", toUsername: "bob" });
    const challengeId = createRes.body.challengeId;

    // Eve attempts to inspect it
    mockAuthUser = { _id: "u3", username: "eve", role: "student" };
    const res = await request(app).get(`/challenge/${challengeId}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/cannot access this challenge/i);
  });

  test("403 — Non-recipient cannot accept another person's challenge", async () => {
    challengeRouter._reset();
    mockAuthUser = { _id: "u1", username: "alice", role: "student" };
    const createRes = await request(app).post("/challenge").send({ fromUsername: "alice", toUsername: "bob" });
    const challengeId = createRes.body.challengeId;

    // Eve attempts to accept bob's challenge
    mockAuthUser = { _id: "u3", username: "eve", role: "student" };
    const res = await request(app).post(`/challenge/${challengeId}/accept`);
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/only the challenged player can accept/i);
  });

  test("403 — Student cannot access another student's activities", async () => {
    mockAuthUser = { _id: "u1", username: "alice", role: "student" };
    const res = await request(app).get("/activities/bob");
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/cannot access another user's activities/i);
  });

  test("403 — Student cannot modify another student's activities", async () => {
    mockAuthUser = { _id: "u1", username: "alice", role: "student" };
    const res = await request(app).put("/activities/bob/activity").send({ activityName: "Solve 3 puzzles" });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/cannot modify another user's activities/i);
  });

  test("403 — Student cannot view another student's streak", async () => {
    mockAuthUser = { _id: "u1", username: "alice", role: "student" };
    const res = await request(app).get("/streak?username=bob");
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/cannot view another user's streak/i);
  });

  test("403 — Student cannot view another student's streak calendar", async () => {
    mockAuthUser = { _id: "u1", username: "alice", role: "student" };
    const res = await request(app).get("/streak/calendar?username=bob&month=2026-08");
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/cannot view another user's streak/i);
  });

  test("403 — Non-owner cannot read another user's badges via shared requireSelf", async () => {
    mockAuthUser = { _id: "u1", username: "alice", role: "student" };
    const res = await request(app).get("/badges/bob");
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/cannot access another user's resource/i);
  });

  test("403 — Non-owner cannot trigger badge awards for another user", async () => {
    mockAuthUser = { _id: "u1", username: "alice", role: "student" };
    const res = await request(app).post("/badges/bob/check-and-award");
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/cannot access another user's resource/i);
  });

  describe("Meeting & Move Endpoints Ownership & IDOR Protection", () => {
    const mockMeeting = {
      meetingId: "m1",
      studentUsername: "alice",
      mentorUsername: "mentor1",
      moves: [[{ fen: "start_fen", pos: "e4", image: "img" }]],
    };

    const mockGame = {
      gameId: "g1",
      userId: "alice",
      moves: [[{ fen: "start_fen", pos: "e4", image: "img" }]],
    };

    beforeEach(() => {
      meetings.findOne.mockResolvedValue(mockMeeting);
      movesList.findOne.mockResolvedValue(mockGame);
      undoPermission.findOne.mockResolvedValue({ meetingId: "m1", permission: true });
    });

    test("403 — Non-participant cannot post boardState to meeting", async () => {
      mockAuthUser = { _id: "u_eve", username: "eve", role: "student" };
      const res = await request(app).post("/meetings/boardState?meetingId=m1&fen=fen2&pos=e5&role=student");
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/not a participant/i);
    });

    test("403 — Non-participant cannot read getBoardState for meeting", async () => {
      mockAuthUser = { _id: "u_eve", username: "eve", role: "student" };
      const res = await request(app).get("/meetings/getBoardState?meetingId=m1");
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/not a participant/i);
    });

    test("403 — Non-participant cannot create newBoardState for meeting", async () => {
      mockAuthUser = { _id: "u_eve", username: "eve", role: "student" };
      const res = await request(app).post("/meetings/newBoardState?meetingId=m1");
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/not a participant/i);
    });

    test("403 — Non-owner cannot update moves in a game via storeMoves", async () => {
      mockAuthUser = { _id: "u_eve", username: "eve", role: "student" };
      const res = await request(app).post("/meetings/storeMoves?gameId=g1&fen=fen2&pos=e5");
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/cannot mutate another user's game moves/i);
    });

    test("403 — Non-owner cannot update newGameStoreMoves", async () => {
      mockAuthUser = { _id: "u_eve", username: "eve", role: "student" };
      const res = await request(app).post("/meetings/newGameStoreMoves?gameId=g1");
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/cannot mutate another user's game moves/i);
    });

    test("403 — Non-owner cannot read getStoreMoves for gameId", async () => {
      mockAuthUser = { _id: "u_eve", username: "eve", role: "student" };
      const res = await request(app).get("/meetings/getStoreMoves?gameId=g1");
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/cannot access another user's game moves/i);
    });

    test("403 — Non-participant cannot read getStoreMoves for meetingId", async () => {
      mockAuthUser = { _id: "u_eve", username: "eve", role: "student" };
      const res = await request(app).get("/meetings/getStoreMoves?meetingId=m1");
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/not a participant/i);
    });

    test("403 — Non-participant cannot check undo permission", async () => {
      mockAuthUser = { _id: "u_eve", username: "eve", role: "student" };
      const res = await request(app).post("/meetings/checkUndoPermission?meetingId=m1");
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/not a participant/i);
    });

    test("403 — Non-participant cannot undo meeting moves", async () => {
      mockAuthUser = { _id: "u_eve", username: "eve", role: "student" };
      const res = await request(app).post("/meetings/undoMeetingMoves?meetingId=m1");
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/not a participant/i);
    });

    test("403 — Non-owner cannot undo game moves", async () => {
      mockAuthUser = { _id: "u_eve", username: "eve", role: "student" };
      const res = await request(app).post("/meetings/undoMoves?gameId=g1");
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/cannot mutate another user's game moves/i);
    });

    test("200/202 — Legitimate participant (student/mentor/admin) can access meeting/game moves", async () => {
      mockAuthUser = { _id: "u_alice", username: "alice", role: "student" };
      const res1 = await request(app).get("/meetings/getBoardState?meetingId=m1");
      expect(res1.status).toBe(200);

      const res2 = await request(app).get("/meetings/getStoreMoves?gameId=g1");
      expect(res2.status).toBe(200);
    });
  });
});

describe("Security Audit Regression: Auth Endpoint Body Credentials Hardening", () => {
  beforeEach(() => {
    mockAuthUser = null;
    jest.clearAllMocks();
  });

  test("POST /auth/login -> 400 when credentials are provided ONLY in query string (not body)", async () => {
    const res = await request(app).post("/auth/login?username=alice&password=secretpassword");
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("errors");
  });

  test("POST /auth/login -> 200 with JWT token when valid credentials provided in JSON body", async () => {
    const crypto = require("crypto");
    const sha384 = crypto.createHash("sha384").update("password123").digest("hex");
    users.findOne.mockResolvedValue({
      username: "alice",
      password: sha384,
      firstName: "Alice",
      lastName: "Smith",
      role: "student",
      email: "alice@example.com",
    });

    const res = await request(app)
      .post("/auth/login")
      .send({ username: "alice", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
  });
});

describe("Security Audit Regression: Intentionally Public Routes (No Auth Required)", () => {
  beforeEach(() => {
    mockAuthUser = null; // Ensure unauthenticated
    if (categorys.find) categorys.find.mockResolvedValue([{ name: "fundamentals" }]);
    if (puzzles.find) puzzles.find.mockResolvedValue([{ title: "puzzle1" }]);
    if (puzzles.aggregate) puzzles.aggregate.mockResolvedValue([{ title: "puzzle1" }]);
  });

  test("GET /badges/catalog returns 200 without authentication", async () => {
    const res = await request(app).get("/badges/catalog");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("badges");
  });

  test("GET /category/list returns 200 without authentication", async () => {
    const res = await request(app).get("/category/list");
    expect(res.status).toBe(200);
  });

  test("GET /puzzles/list and /puzzles/random return 200 without 401", async () => {
    const res1 = await request(app).get("/puzzles/list");
    expect(res1.status).toBe(200);
    const res2 = await request(app).get("/puzzles/random");
    expect(res2.status).toBe(200);
  });
});
