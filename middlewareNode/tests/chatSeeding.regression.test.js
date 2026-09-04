/**
 * Regression test — chat.js's default CoachTemplate/Guardrail seeding
 * must never run when NODE_ENV=production. Issue 5, Phase 2/6 (same gate
 * pattern as db.js's seedTestUsers, applied here for consistency).
 */

jest.mock("../src/models/ChatSession");
jest.mock("../src/models/ChatMessage");
jest.mock("../src/models/CoachTemplate");
jest.mock("../src/models/Guardrail");
// Unrelated to seeding — this test resetModules()'s chat.js twice, and the
// real chatService kicks off a genuine (fire-and-forget) NLP training run
// on each require that can otherwise still be in flight after the test
// file finishes, producing spurious "log after tests are done" noise.
jest.mock("../src/utils/chatService");
jest.mock("passport", () => ({
  authenticate: jest.fn(() => (req, res, next) => next()),
}));

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

afterEach(() => {
  process.env.NODE_ENV = ORIGINAL_NODE_ENV;
  jest.resetModules();
  jest.clearAllMocks();
});

// seedDefaultTemplates/seedDefaultGuardrail are fire-and-forget promises
// kicked off at module load — flush the microtask queue before asserting
// so we're not checking before an (incorrectly) fired call would land.
const flush = () => new Promise((resolve) => setImmediate(resolve));

describe("chat.js seeding — production gate", () => {
  test("does NOT seed default templates or guardrails when NODE_ENV=production", async () => {
    process.env.NODE_ENV = "production";
    jest.resetModules();

    const CoachTemplate = require("../src/models/CoachTemplate");
    const Guardrail = require("../src/models/Guardrail");

    require("../src/routes/chat");
    await flush();
    await flush();

    expect(CoachTemplate.findOneAndUpdate).not.toHaveBeenCalled();
    expect(Guardrail.countDocuments).not.toHaveBeenCalled();
  });

  test("DOES seed default templates and guardrails outside production (gate isn't inverted)", async () => {
    process.env.NODE_ENV = "test";
    jest.resetModules();

    const CoachTemplate = require("../src/models/CoachTemplate");
    const Guardrail = require("../src/models/Guardrail");

    require("../src/routes/chat");
    await flush();
    await flush();

    expect(CoachTemplate.findOneAndUpdate).toHaveBeenCalled();
    expect(Guardrail.countDocuments).toHaveBeenCalled();
  });
});
