/**
 * Verifies the CORS origin-rejection behavior in src/server.js.
 * server.js can't be imported directly (it calls connectDB()/app.listen() and
 * requires SESSION_SECRET/Mongo at module load), so this mirrors its origin
 * callback logic in an isolated app, the same approach already used by the
 * chessServer/stockfishServer test suites. Keep this in sync with server.js
 * if that logic changes.
 */

const express = require("express");
const cors = require("cors");
const request = require("supertest");

function buildApp(allowedOriginsCsv) {
  const allowedOrigins = String(allowedOriginsCsv || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  const app = express();
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(null, false);
      },
    })
  );
  app.get("/ping", (req, res) => res.json({ ok: true }));
  return app;
}

describe("CORS origin callback", () => {
  const app = buildApp("https://ystemandchess.com,http://localhost:3000");

  test("allowed origin gets the Access-Control-Allow-Origin header", async () => {
    const res = await request(app).get("/ping").set("Origin", "http://localhost:3000");
    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
  });

  test("disallowed origin is rejected without throwing a 500", async () => {
    const res = await request(app).get("/ping").set("Origin", "https://evil.example.com");
    expect(res.status).not.toBe(500);
    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  test("requests with no Origin header (curl, server-to-server) are unaffected", async () => {
    const res = await request(app).get("/ping");
    expect(res.status).toBe(200);
  });
});
