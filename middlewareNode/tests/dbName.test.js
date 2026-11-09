const { resolveDbName } = require("../src/config/dbName");

describe("resolveDbName", () => {
  it("resolves the name from the URI path when no explicit name is set", () => {
    expect(resolveDbName("mongodb://mongo:27017/ystem_dev", "")).toBe("ystem_dev");
  });

  it("an explicit name overrides the URI path", () => {
    expect(resolveDbName("mongodb://mongo:27017/ystem_dev", "ystem_override")).toBe(
      "ystem_override",
    );
  });

  it("parses a URI with query params correctly, ignoring them", () => {
    const uri = "mongodb+srv://user:pass@cluster.mongodb.net/ystem_prod?retryWrites=true&w=majority";
    expect(resolveDbName(uri, "")).toBe("ystem_prod");
  });

  it("returns null when neither an explicit name nor a URI path is present", () => {
    expect(resolveDbName("mongodb://mongo:27017/", "")).toBeNull();
    expect(resolveDbName("mongodb://mongo:27017", "")).toBeNull();
  });

  it("returns null for an unparsable URI with no explicit name", () => {
    expect(resolveDbName("not a uri at all", "")).toBeNull();
  });

  it("an explicit name wins even when the URI is empty or unparsable", () => {
    expect(resolveDbName("", "ystem_override")).toBe("ystem_override");
    expect(resolveDbName("not a uri at all", "ystem_override")).toBe("ystem_override");
  });
});

describe("resolveDbName — mongoose and the native driver agree", () => {
  const { MongoMemoryServer } = require("mongodb-memory-server");
  const mongoose = require("mongoose");
  const { MongoClient } = require("mongodb");

  jest.setTimeout(30000);

  it("mongoose.connect({ dbName }) and a cachedClient.db(dbName) land on the identical database", async () => {
    const mongod = await MongoMemoryServer.create();
    const baseUri = mongod.getUri(); // no path of its own
    const uri = `${baseUri}ystem_consistency_check`;
    const dbName = resolveDbName(uri, "");
    expect(dbName).toBe("ystem_consistency_check");

    await mongoose.connect(uri, { dbName });
    const client = new MongoClient(baseUri);
    await client.connect();

    try {
      expect(mongoose.connection.db.databaseName).toBe(dbName);
      expect(client.db(dbName).databaseName).toBe(dbName);
      expect(mongoose.connection.db.databaseName).toBe(client.db(dbName).databaseName);
    } finally {
      await mongoose.disconnect();
      await client.close();
      await mongod.stop();
    }
  });
});
