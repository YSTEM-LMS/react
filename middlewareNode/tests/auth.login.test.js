/**
 * Integration tests — POST /auth/login
 *
 * Covers the legacy-SHA-384-to-bcrypt upgrade-on-login migration (see
 * src/utils/password.js) and the per-username+IP rate limiter added
 * alongside it. The Users model is mocked so no real DB is needed.
 */

const crypto = require("crypto");

jest.mock("../src/models/users");

const express = require("express");
const request = require("supertest");
const Users = require("../src/models/users");
const { hashPassword } = require("../src/utils/password");

const legacyHash = (plaintext) => crypto.createHash("sha384").update(plaintext).digest("hex");

// LOGIN_RATE_LIMIT_MAX is read once at module load time, so set it before
// requiring the route for the rate-limit test to use a small, fast window.
process.env.LOGIN_RATE_LIMIT_MAX = "3";
const authRoute = require("../src/routes/auth");

const app = express();
app.use(express.json());
app.use("/auth", authRoute);

afterEach(() => {
  jest.clearAllMocks();
});

describe("POST /auth/login", () => {
  test("400 — unknown username", async () => {
    Users.findOne.mockResolvedValue(null);

    const res = await request(app).post("/auth/login").send({ username: "nobody", password: "whatever" });

    expect(res.status).toBe(400);
  });

  test("400 — wrong password against a legacy SHA-384 hash", async () => {
    Users.findOne.mockResolvedValue({
      username: "alice",
      password: legacyHash("correctpassword"),
      role: "student",
      save: jest.fn(),
    });

    const res = await request(app).post("/auth/login").send({ username: "alice", password: "wrongpassword" });

    expect(res.status).toBe(400);
  });

  test("200 — correct password against a legacy hash logs in AND upgrades the stored hash to bcrypt", async () => {
    const foundUser = {
      username: "alice",
      password: legacyHash("correctpassword"),
      role: "student",
      save: jest.fn().mockResolvedValue(undefined),
    };
    Users.findOne.mockResolvedValue(foundUser);

    const res = await request(app).post("/auth/login").send({ username: "alice", password: "correctpassword" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();

    // The migration actually happening: the in-memory document's password
    // field was replaced with a bcrypt hash and persisted.
    expect(foundUser.save).toHaveBeenCalledTimes(1);
    expect(foundUser.password).toMatch(/^\$2[aby]?\$/);
  });

  test("200 — correct password against an already-bcrypt hash logs in and does NOT rewrite it", async () => {
    const bcryptHash = await hashPassword("correctpassword");
    const foundUser = {
      username: "bob",
      password: bcryptHash,
      role: "mentor",
      save: jest.fn().mockResolvedValue(undefined),
    };
    Users.findOne.mockResolvedValue(foundUser);

    const res = await request(app).post("/auth/login").send({ username: "bob", password: "correctpassword" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(foundUser.save).not.toHaveBeenCalled();
    expect(foundUser.password).toBe(bcryptHash);
  });

  test("429 — rate limit trips after repeated attempts for the same username+IP", async () => {
    Users.findOne.mockResolvedValue(null);

    // LOGIN_RATE_LIMIT_MAX was set to 3 above, at module load time.
    const attempts = [1, 2, 3, 4].map(() =>
      request(app).post("/auth/login").send({ username: "target-account", password: "guess" })
    );
    const responses = [];
    for (const attempt of attempts) {
      responses.push(await attempt); // sequential: rate limiting is per-request-order
    }

    expect(responses.slice(0, 3).every((r) => r.status === 400)).toBe(true);
    expect(responses[3].status).toBe(429);
  });

  test("rate limit is scoped per username — a different username from the same caller is unaffected", async () => {
    Users.findOne.mockResolvedValue(null);

    for (let i = 0; i < 3; i++) {
      await request(app).post("/auth/login").send({ username: "exhausted-account", password: "guess" });
    }
    // "exhausted-account" is now over budget; a different username should not be.
    const res = await request(app).post("/auth/login").send({ username: "fresh-account", password: "guess" });

    expect(res.status).toBe(400); // not 429
  });
});
