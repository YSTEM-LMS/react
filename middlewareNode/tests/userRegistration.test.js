/**
 * Integration tests — registration guard against the "guest:" reserved
 * username prefix.
 *
 * "guest:" usernames are reserved for chessServer's ephemeral, unauthenticated
 * puzzle rooms (anonymous /puzzles visits and Puzzle Streak — see
 * chessServer/src/managers/GameManager.js). No real account may use one, so
 * a real student's puzzle room can never collide with a guest room.
 */

jest.mock("passport", () => ({
  authenticate: jest.fn(() => (req, res, next) => {
    req.user = { username: "parent1", role: "parent" };
    next();
  }),
}));
jest.mock("../src/models/users");
jest.mock("../src/models/activities");
jest.mock("../src/utils/activities", () => ({
  selectActivities: jest.fn().mockResolvedValue([]),
}));

const express = require("express");
const request = require("supertest");
const usersRoute = require("../src/routes/users");
const Users = require("../src/models/users");

const app = express();
app.use(express.json());
app.use("/user", usersRoute);

afterEach(() => {
  jest.clearAllMocks();
});

describe('POST /user/ — registration guard against "guest:" usernames', () => {
  test('400 — rejects a "guest:" username for the main account', async () => {
    const res = await request(app).post("/user/").query({
      username: "guest:abc",
      password: "pw",
      first: "A",
      last: "B",
      email: "a@b.com",
      role: "student",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/reserved/i);
    expect(Users.findOne).not.toHaveBeenCalled();
  });

  test("400 — rejects case variants (GUEST:, Guest:)", async () => {
    for (const username of ["GUEST:abc", "Guest:abc"]) {
      const res = await request(app).post("/user/").query({
        username,
        password: "pw",
        first: "A",
        last: "B",
        email: "a@b.com",
        role: "student",
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/reserved/i);
    }
  });

  test('400 — rejects a "guest:" username inside a parent\'s students[] payload', async () => {
    Users.findOne.mockResolvedValue(null); // the parent's own username isn't taken
    const res = await request(app)
      .post("/user/")
      .query({
        username: "parent1",
        password: "pw",
        first: "A",
        last: "B",
        email: "a@b.com",
        role: "parent",
        students: JSON.stringify([
          { username: "guest:child", password: "pw", first: "C", last: "D", email: "c@d.com" },
        ]),
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/reserved/i);
  });
});

describe('POST /user/children — registration guard against "guest:" usernames', () => {
  test('400 — rejects a "guest:" username', async () => {
    const res = await request(app).post("/user/children").query({
      username: "guest:child",
      password: "pw",
      first: "C",
      last: "D",
      email: "c@d.com",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/reserved/i);
    expect(Users.findOne).not.toHaveBeenCalled();
  });

  test("400 — rejects case variants (GUEST:, Guest:)", async () => {
    for (const username of ["GUEST:child", "Guest:child"]) {
      const res = await request(app).post("/user/children").query({
        username,
        password: "pw",
        first: "C",
        last: "D",
        email: "c@d.com",
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/reserved/i);
    }
  });
});
