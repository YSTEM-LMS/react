// Port 0 lets the OS pick a free port, so this can't collide with other suites.
process.env.PORT = "0";

const request = require("supertest");
const { server, io } = require("../index");

afterAll((done) => {
  io.close(() => done());
});

test("GET /health returns ok", async () => {
  const res = await request(server).get("/health");
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ status: "ok" });
});
