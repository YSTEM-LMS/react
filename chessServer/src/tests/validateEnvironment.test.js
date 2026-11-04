const validateEnvironment = require("../validateEnvironment");

const ORIGINAL_ENV = process.env;

describe("validateEnvironment", () => {
  let exitSpy;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    exitSpy = jest.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    jest.restoreAllMocks();
  });

  const clearRequired = () => {
    for (const name of ["MIDDLEWARE_URL", "CHESS_SERVICE_KEY", "CORS_ORIGIN", "ALLOWED_ORIGINS"]) {
      delete process.env[name];
    }
  };

  it.each([undefined, "", "development", "test"])(
    "skips validation when NODE_ENV=%p",
    (nodeEnv) => {
      clearRequired();
      if (nodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = nodeEnv;

      expect(() => validateEnvironment()).not.toThrow();
      expect(exitSpy).not.toHaveBeenCalled();
    }
  );

  it.each(["production", "staging", "qa", "prod"])(
    "exits when required vars are missing and NODE_ENV=%p",
    (nodeEnv) => {
      clearRequired();
      process.env.NODE_ENV = nodeEnv;

      expect(() => validateEnvironment()).toThrow("process.exit");
      expect(exitSpy).toHaveBeenCalledWith(1);
    }
  );

  it("exits in production when CHESS_SERVICE_KEY specifically is missing", () => {
    process.env.NODE_ENV = "production";
    process.env.MIDDLEWARE_URL = "https://middleware.example.com";
    process.env.CORS_ORIGIN = "https://ystemandchess.com";
    delete process.env.CHESS_SERVICE_KEY;

    expect(() => validateEnvironment()).toThrow("process.exit");
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("CHESS_SERVICE_KEY"));
  });

  it("exits when neither CORS_ORIGIN nor ALLOWED_ORIGINS is set", () => {
    process.env.NODE_ENV = "production";
    process.env.MIDDLEWARE_URL = "https://middleware.example.com";
    process.env.CHESS_SERVICE_KEY = "a-real-key";
    delete process.env.CORS_ORIGIN;
    delete process.env.ALLOWED_ORIGINS;

    expect(() => validateEnvironment()).toThrow("process.exit");
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("CORS_ORIGIN or ALLOWED_ORIGINS")
    );
  });

  it("passes in production when every required var is set", () => {
    process.env.NODE_ENV = "production";
    process.env.MIDDLEWARE_URL = "https://middleware.example.com";
    process.env.CHESS_SERVICE_KEY = "a-real-key";
    process.env.CORS_ORIGIN = "https://ystemandchess.com";

    expect(() => validateEnvironment()).not.toThrow();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("passes in a non-local environment when everything is set", () => {
    process.env.NODE_ENV = "staging";
    process.env.MIDDLEWARE_URL = "https://example.com/middleware";
    process.env.CHESS_SERVICE_KEY = "a-real-key";
    process.env.CORS_ORIGIN = "https://example.com";

    expect(() => validateEnvironment()).not.toThrow();
    expect(exitSpy).not.toHaveBeenCalled();
  });
});
