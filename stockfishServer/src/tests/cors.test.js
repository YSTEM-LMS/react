/**
 * Verifies the CORS origin/credentials behavior in src/index.js.
 * index.js can't be imported directly (it calls server.listen() as a
 * module-load side effect), so this mirrors its corsOptions logic in an
 * isolated app, the same approach chessServer/src/tests/cors.test.js uses.
 * Keep this in sync with src/index.js if that logic changes.
 */

const express = require("express");
const cors = require("cors");
const request = require("supertest");

function buildApp(allowedOriginsCsv) {
  const allowedOrigins = allowedOriginsCsv.split(",").map((o) => o.trim());
  const hasWildcard = allowedOrigins.includes("*");

  const app = express();
  app.use(
    cors({
      origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (hasWildcard) {
          return callback(null, true);
        }
        if (allowedOrigins.indexOf(origin) !== -1) {
          callback(null, true);
        } else {
          callback(null, false);
        }
      },
      methods: ["GET", "POST"],
      credentials: !hasWildcard,
    })
  );
  app.get("/ping", (req, res) => res.json({ ok: true }));
  return app;
}

describe("stockfishServer CORS origin/credentials behavior", () => {
  test("allowed origin (no wildcard): credentials allowed, header set to the origin", async () => {
    const app = buildApp("https://ystemandchess.com,http://localhost:3000");
    const res = await request(app).get("/ping").set("Origin", "http://localhost:3000");

    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });

  test("disallowed origin (no wildcard): rejected without a 500, no CORS header", async () => {
    const app = buildApp("https://ystemandchess.com,http://localhost:3000");
    const res = await request(app).get("/ping").set("Origin", "https://evil.example.com");

    expect(res.status).not.toBe(500);
    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  test("wildcard configured: any origin allowed, but credentials are disabled", async () => {
    const app = buildApp("*");
    const res = await request(app).get("/ping").set("Origin", "https://anything.example.com");

    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBe("https://anything.example.com");
    expect(res.headers["access-control-allow-credentials"]).toBeUndefined();
  });
});
