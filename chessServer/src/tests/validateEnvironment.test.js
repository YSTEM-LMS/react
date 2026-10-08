const validateEnvironment = require("../validateEnvironment");

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(process, "exit").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

describe("validateEnvironment", () => {
  test("does nothing outside production", () => {
    process.env.NODE_ENV = "test";
    delete process.env.CHESS_SERVICE_KEY;
    delete process.env.MIDDLEWARE_URL;
    validateEnvironment();
    expect(process.exit).not.toHaveBeenCalled();
  });

  test("exits in production when CHESS_SERVICE_KEY is missing", () => {
    process.env.NODE_ENV = "production";
    process.env.MIDDLEWARE_URL = "https://middleware.example.com";
    process.env.CORS_ORIGIN = "https://ystemandchess.com";
    delete process.env.CHESS_SERVICE_KEY;

    validateEnvironment();

    expect(process.exit).toHaveBeenCalledWith(1);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("CHESS_SERVICE_KEY"));
  });

  test("exits in production when neither CORS_ORIGIN nor ALLOWED_ORIGINS is set", () => {
    process.env.NODE_ENV = "production";
    process.env.MIDDLEWARE_URL = "https://middleware.example.com";
    process.env.CHESS_SERVICE_KEY = "a-real-key";
    delete process.env.CORS_ORIGIN;
    delete process.env.ALLOWED_ORIGINS;

    validateEnvironment();

    expect(process.exit).toHaveBeenCalledWith(1);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("CORS_ORIGIN or ALLOWED_ORIGINS")
    );
  });

  test("passes in production when every required var is set", () => {
    process.env.NODE_ENV = "production";
    process.env.MIDDLEWARE_URL = "https://middleware.example.com";
    process.env.CHESS_SERVICE_KEY = "a-real-key";
    process.env.CORS_ORIGIN = "https://ystemandchess.com";

    validateEnvironment();

    expect(process.exit).not.toHaveBeenCalled();
  });
});
