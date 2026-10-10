/**
 * routes/lessons.js — /getTotalPieceLesson and /getLesson for a piece with
 * no lessons, plus the getDb() fallback's database name.
 *
 * /getTotalPieceLesson used to read `.lessons` on a null document and return
 * 500 for any piece name not in newLessons (the lesson menu's names didn't
 * match the dev seed, so every local lesson page failed this way). It now
 * returns 404. It also checked `!piece` after decodeURIComponent, which turns
 * a missing parameter into the string "undefined", so the 400 never fired.
 */

const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");

jest.setTimeout(60000);

// The routes authenticate optionally; a guest is fine for these reads.
jest.mock("passport", () => ({
  authenticate: (_strategy, _opts, callback) => (req, res, next) => callback(null, false, null),
}));

const express = require("express");
const request = require("supertest");
const lessonsRouter = require("../src/routes/lessons");
const fallbackDbName = require("../src/config/fallbackDbName");

const app = express();
app.use(express.json());
app.use("/lessons", lessonsRouter);

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { launchTimeout: 30000 } });
  await mongoose.connect(mongod.getUri() + "ystem_dev");
  await mongoose.connection.collection("newLessons").insertOne({
    piece: "Pawn - It moves forward only",
    lessons: [{ name: "Basic" }, { name: "Capture" }],
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe("GET /lessons/getTotalPieceLesson", () => {
  test("returns the number of lessons for a known piece", async () => {
    const res = await request(app)
      .get("/lessons/getTotalPieceLesson")
      .query({ piece: "Pawn - It moves forward only" });
    expect(res.status).toBe(200);
    expect(res.body).toBe(2);
  });

  test("returns 404, not 500, for a piece with no lessons", async () => {
    const res = await request(app).get("/lessons/getTotalPieceLesson").query({ piece: "pawn" });
    expect(res.status).toBe(404);
  });

  test("returns 400 when the piece parameter is missing", async () => {
    const res = await request(app).get("/lessons/getTotalPieceLesson");
    expect(res.status).toBe(400);
  });
});

describe("GET /lessons/getLesson", () => {
  test("returns 400 for a piece with no lessons (unchanged behaviour)", async () => {
    const res = await request(app).get("/lessons/getLesson").query({ piece: "pawn", lessonNum: 1 });
    expect(res.status).toBe(400);
  });

  test("returns the requested lesson for a known piece", async () => {
    const res = await request(app)
      .get("/lessons/getLesson")
      .query({ piece: "Pawn - It moves forward only", lessonNum: 2 });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Capture");
  });
});

describe("fallbackDbName", () => {
  test.each([
    ["mongodb://mongo:27017/ystem_dev", "ystem_dev"],
    ["mongodb+srv://user:pass@cluster0.example.net/ystem?retryWrites=true&w=majority", "ystem"],
    ["mongodb+srv://user:pass@cluster0.example.net/test?retryWrites=true", "test"],
    // No database in the URI: keep the previous hardcoded default, not the driver's "test".
    ["mongodb+srv://user:pass@cluster0.example.net/?retryWrites=true", "ystem"],
    ["mongodb://localhost:27017", "ystem"],
    ["", "ystem"],
    [undefined, "ystem"],
  ])("%s -> %s", (uri, expected) => {
    expect(fallbackDbName(uri)).toBe(expected);
  });
});
