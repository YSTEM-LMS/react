/**
 * Integration tests — PUT /user/profile
 *
 * Covers demographic fields (zipcode/gender/gradeLevel) and, notably,
 * country/state/school — the leaderboard-filter fields that previously
 * had no write path anywhere in the app (they existed on the schema and
 * were filterable on /leaderboard, but nothing let a student set them).
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
const Users = require("../src/models/users");

const app = express();
app.use(express.json());
app.use("/user", usersRoute);

afterEach(() => {
  jest.clearAllMocks();
  mockCurrentAuthUser = { username: "alice", role: "student" };
});

describe("PUT /user/profile", () => {
  beforeEach(() => {
    Users.updateOne.mockResolvedValue({ modifiedCount: 1 });
  });

  test("401 — no authenticated user", async () => {
    mockCurrentAuthUser = null;
    const res = await request(app).put("/user/profile").send({ country: "USA" });
    expect(res.status).toBe(401);
  });

  test("400 — no updatable fields provided", async () => {
    const res = await request(app).put("/user/profile").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no updatable fields/i);
  });

  test("400 — invalid gender value rejected", async () => {
    const res = await request(app).put("/user/profile").send({ gender: "invalid" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/gender must be/i);
  });

  test("200 — updates country, state, and school for the authenticated user's own record", async () => {
    const res = await request(app)
      .put("/user/profile")
      .send({ country: "USA", state: "FL", school: "Jefferson Middle" });

    expect(res.status).toBe(200);
    expect(Users.updateOne).toHaveBeenCalledWith(
      { username: "alice" },
      { $set: { country: "USA", state: "FL", school: "Jefferson Middle" } }
    );
  });

  test("200 — updates country/state/school alongside existing demographic fields in one call", async () => {
    const res = await request(app)
      .put("/user/profile")
      .send({ zipcode: "30301", gender: "F", country: "Canada", state: "ON" });

    expect(res.status).toBe(200);
    expect(Users.updateOne).toHaveBeenCalledWith(
      { username: "alice" },
      { $set: { zipcode: "30301", gender: "F", country: "Canada", state: "ON" } }
    );
  });

  test("empty string values are normalized to null", async () => {
    await request(app).put("/user/profile").send({ country: "", state: "", school: "" });
    expect(Users.updateOne).toHaveBeenCalledWith(
      { username: "alice" },
      { $set: { country: null, state: null, school: null } }
    );
  });

  test("200 — gender: \"\" is accepted and saves as null, like the other fields", async () => {
    const res = await request(app).put("/user/profile").send({ gender: "" });
    expect(res.status).toBe(200);
    expect(Users.updateOne).toHaveBeenCalledWith(
      { username: "alice" },
      { $set: { gender: null } }
    );
  });

  test("only sends the fields actually provided in the request", async () => {
    await request(app).put("/user/profile").send({ school: "Pine View School" });
    expect(Users.updateOne).toHaveBeenCalledWith(
      { username: "alice" },
      { $set: { school: "Pine View School" } }
    );
  });

  test("always writes to the authenticated user's own username, ignoring any other identifier", async () => {
    mockCurrentAuthUser = { username: "bob", role: "student" };
    await request(app)
      .put("/user/profile")
      .send({ username: "someone-else", country: "USA" });

    expect(Users.updateOne).toHaveBeenCalledWith(
      { username: "bob" },
      expect.anything()
    );
  });

  test("500 — returns server error on DB failure", async () => {
    Users.updateOne.mockRejectedValue(new Error("DB down"));
    const res = await request(app).put("/user/profile").send({ country: "USA" });
    expect(res.status).toBe(500);
  });
});
