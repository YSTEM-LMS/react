const validateEnvironment = require("../src/config/validateEnvironment");

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
    for (const name of ["MONGO_URI", "INDEX_KEY", "CORS_ORIGIN", "SESSION_SECRET"]) {
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

  it("passes in a non-local environment when everything is set", () => {
    process.env.NODE_ENV = "staging";
    process.env.MONGO_URI = "mongodb://example/db";
    process.env.INDEX_KEY = "k";
    process.env.CORS_ORIGIN = "https://example.com";
    process.env.SESSION_SECRET = "s";

    expect(() => validateEnvironment()).not.toThrow();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  const setOtherRequired = () => {
    process.env.INDEX_KEY = "k";
    process.env.CORS_ORIGIN = "https://example.com";
    process.env.SESSION_SECRET = "s";
  };

  it("exits outside local/test when the URI has no path and MONGO_DB_NAME is unset", () => {
    process.env.NODE_ENV = "production";
    setOtherRequired();
    process.env.MONGO_URI = "mongodb://example.mongodb.net";
    delete process.env.MONGO_DB_NAME;

    expect(() => validateEnvironment()).toThrow("process.exit");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("passes outside local/test when MONGO_DB_NAME is set even though the URI has no path", () => {
    process.env.NODE_ENV = "production";
    setOtherRequired();
    process.env.MONGO_URI = "mongodb://example.mongodb.net";
    process.env.MONGO_DB_NAME = "ystem_prod";

    expect(() => validateEnvironment()).not.toThrow();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it.each([undefined, "", "development", "test"])(
    "does not crash when NODE_ENV=%p even if neither MONGO_URI's path nor MONGO_DB_NAME is set",
    (nodeEnv) => {
      clearRequired();
      delete process.env.MONGO_DB_NAME;
      if (nodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = nodeEnv;

      expect(() => validateEnvironment()).not.toThrow();
      expect(exitSpy).not.toHaveBeenCalled();
    },
  );
});
