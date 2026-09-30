/**
 * Integration tests — GET /user/me
 *
 * A minimal JWT-protected "whoami" endpoint: returns only the authenticated
 * caller's own username. Used by chessServer to verify that a socket
 * claiming to be a given student actually holds that student's login token
 * before seating them in a puzzle room.
 */

let mockCurrentAuthUser = { username: "alice", role: "student" };

jest.mock("passport", () => ({
  authenticate: jest.fn(() => (req, res, next) => {
    if (!mockCurrentAuthUser) return res.status(401).json({ error: "Unauthorized" });
    req.user = mockCurrentAuthUser;
    next();
  }),
}));
jest.mock("../src/models/users");

const express = require("express");
const request = require("supertest");
const usersRoute = require("../src/routes/users");

const app = express();
app.use(express.json());
app.use("/user", usersRoute);

afterEach(() => {
  jest.clearAllMocks();
  mockCurrentAuthUser = { username: "alice", role: "student" };
});

describe("GET /user/me", () => {
  test("200 — returns the authenticated caller's own username", async () => {
    const res = await request(app).get("/user/me");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ username: "alice" });
  });

  test("401 — no authenticated user", async () => {
    mockCurrentAuthUser = null;
    const res = await request(app).get("/user/me");
    expect(res.status).toBe(401);
  });
});
