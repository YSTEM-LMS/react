/**
 * Integration tests — PUT /user/updateMentorship
 *
 * Live mentor sessions pair a student only with their assigned mentor, so the
 * assignment itself must be locked down: before this, any logged-in user could
 * set any username as their mentorship link and overwrite the other side.
 */

let mockCurrentAuthUser = null;

jest.mock("passport", () => ({
  authenticate: jest.fn((strategy, options, callback) => (req, res, next) => {
    if (typeof callback === "function") {
      return callback(null, mockCurrentAuthUser, null);
    }
    if (!mockCurrentAuthUser) return res.status(401).json({ message: "Unauthorized" });
    req.user = mockCurrentAuthUser;
    next();
  }),
}));
jest.mock("../src/models/users");

const express = require("express");
const request = require("supertest");
const usersRoute = require("../src/routes/users");
const Users = require("../src/models/users");

const app = express();
app.use(express.json());
app.use("/user", usersRoute);

const MENTOR = { username: "bob", role: "mentor", mentorshipUsername: "" };
const STUDENT = { username: "alice", role: "student", mentorshipUsername: "" };

function claim(username) {
  return request(app).put(`/user/updateMentorship?mentorship=${encodeURIComponent(username)}`);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCurrentAuthUser = MENTOR;
  Users.findOneAndUpdate.mockResolvedValue({ ...STUDENT, mentorshipUsername: "bob" });
  Users.updateOne.mockResolvedValue({ modifiedCount: 1 });
});

describe("PUT /user/updateMentorship", () => {
  test("401 when not logged in", async () => {
    mockCurrentAuthUser = null;

    const res = await claim("alice");

    expect(res.status).toBe(401);
    expect(Users.findOneAndUpdate).not.toHaveBeenCalled();
  });

  test("400 when the student username is missing", async () => {
    const res = await request(app).put("/user/updateMentorship");

    expect(res.status).toBe(400);
    expect(Users.findOneAndUpdate).not.toHaveBeenCalled();
  });

  test("a student can't attach themselves to a mentor", async () => {
    mockCurrentAuthUser = STUDENT;

    const res = await claim("bob");

    expect(res.status).toBe(403);
    expect(Users.findOneAndUpdate).not.toHaveBeenCalled();
    expect(Users.updateOne).not.toHaveBeenCalled();
  });

  test("other roles can't set a mentorship", async () => {
    mockCurrentAuthUser = { username: "pat", role: "parent", mentorshipUsername: "" };

    const res = await claim("alice");

    expect(res.status).toBe(403);
    expect(Users.updateOne).not.toHaveBeenCalled();
  });

  test("a mentor can't pick themselves", async () => {
    const res = await claim("bob");

    expect(res.status).toBe(400);
    expect(Users.findOneAndUpdate).not.toHaveBeenCalled();
  });

  test("a mentor claims an unassigned student and both sides are linked", async () => {
    // Act
    const res = await claim("alice");

    // Assert
    expect(res.status).toBe(200);
    expect(Users.findOneAndUpdate).toHaveBeenCalledWith(
      {
        username: "alice",
        role: "student",
        mentorshipUsername: { $in: ["", null, "bob"] },
      },
      { $set: { mentorshipUsername: "bob" } },
      { new: true },
    );
    expect(Users.updateOne).toHaveBeenCalledWith(
      { username: "bob" },
      { $set: { mentorshipUsername: "alice" } },
    );
  });

  test("409 when the student already has another mentor, and nothing is written", async () => {
    // The guarded filter doesn't match a student owned by someone else.
    Users.findOneAndUpdate.mockResolvedValue(null);

    const res = await claim("alice");

    expect(res.status).toBe(409);
    expect(Users.updateOne).not.toHaveBeenCalled();
  });

  test("409 when the target isn't a student (e.g. another mentor)", async () => {
    Users.findOneAndUpdate.mockResolvedValue(null);

    const res = await claim("carol");

    expect(res.status).toBe(409);
    expect(Users.findOneAndUpdate.mock.calls[0][0]).toMatchObject({ role: "student" });
    expect(Users.updateOne).not.toHaveBeenCalled();
  });

  test("switching students releases the previous student", async () => {
    mockCurrentAuthUser = { ...MENTOR, mentorshipUsername: "erin" };

    const res = await claim("alice");

    expect(res.status).toBe(200);
    expect(Users.updateOne).toHaveBeenCalledWith(
      { username: "erin", mentorshipUsername: "bob" },
      { $set: { mentorshipUsername: "" } },
    );
    expect(Users.updateOne).toHaveBeenCalledWith(
      { username: "bob" },
      { $set: { mentorshipUsername: "alice" } },
    );
  });

  test("re-claiming the current student succeeds without releasing anyone", async () => {
    mockCurrentAuthUser = { ...MENTOR, mentorshipUsername: "alice" };

    const res = await claim("alice");

    expect(res.status).toBe(200);
    expect(Users.updateOne).toHaveBeenCalledTimes(1);
    expect(Users.updateOne).toHaveBeenCalledWith(
      { username: "bob" },
      { $set: { mentorshipUsername: "alice" } },
    );
  });

  test("500 with a generic message on a database error", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    Users.findOneAndUpdate.mockRejectedValue(new Error("connection refused"));

    const res = await claim("alice");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ message: "Internal server error" });
  });
});
