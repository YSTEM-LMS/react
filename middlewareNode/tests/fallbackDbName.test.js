const fallbackDbName = require("../src/config/fallbackDbName");

describe("fallbackDbName — mongoose and the native driver agree", () => {
  const { MongoMemoryServer } = require("mongodb-memory-server");
  const mongoose = require("mongoose");
  const { MongoClient } = require("mongodb");

  jest.setTimeout(30000);

  it("mongoose.connect({ dbName }) and a raw MongoClient.db(dbName) land on the identical database for a URI with no path", async () => {
    const mongod = await MongoMemoryServer.create();
    const baseUri = mongod.getUri(); // no path of its own
    const dbName = fallbackDbName(baseUri);
    expect(dbName).toBe("ystem"); // the documented legacy default

    await mongoose.connect(baseUri, { dbName });
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

  it("mongoose.connect({ dbName }) and a raw MongoClient.db(dbName) agree when the URI does name a database", async () => {
    const mongod = await MongoMemoryServer.create();
    const baseUri = mongod.getUri();
    const uri = `${baseUri}ystem_consistency_check`;
    const dbName = fallbackDbName(uri);
    expect(dbName).toBe("ystem_consistency_check");

    await mongoose.connect(uri, { dbName });
    const client = new MongoClient(baseUri);
    await client.connect();

    try {
      expect(mongoose.connection.db.databaseName).toBe(dbName);
      expect(client.db(dbName).databaseName).toBe(dbName);
    } finally {
      await mongoose.disconnect();
      await client.close();
      await mongod.stop();
    }
  });
});

describe("db.js's real connectDB() resolves the same database getDb() falls back to", () => {
  const { MongoMemoryServer } = require("mongodb-memory-server");
  const { MongoClient } = require("mongodb");

  jest.setTimeout(30000);

  // getDb() itself isn't exported from the 5 route/util/scheduler files (and
  // shouldn't be — they're kept byte-identical to main), so it can't be
  // called directly here. What's checked instead: db.js's actual exported
  // connectDB() — not a reimplementation of mongoose.connect — against the
  // exact expression every getDb() fallback uses (cachedClient.db(
  // fallbackDbName(uri))), verified identical across all five in the diff
  // against origin/main.
  it("connectDB() lands on the same database getDb()'s cachedClient.db(fallbackDbName(uri)) would", async () => {
    const mongod = await MongoMemoryServer.create();
    const baseUri = mongod.getUri(); // no path of its own

    jest.resetModules();
    jest.doMock("config", () => ({
      get: (key) => (key === "mongoURI" ? baseUri : ""),
    }));
    const mongoose = require("mongoose");
    const connectDB = require("../src/config/db");
    const fallbackDbNameFresh = require("../src/config/fallbackDbName");

    await connectDB();

    const client = new MongoClient(baseUri);
    await client.connect();
    const fallbackDb = client.db(fallbackDbNameFresh(baseUri));

    try {
      expect(mongoose.connection.db.databaseName).toBe("ystem"); // documented legacy default
      expect(mongoose.connection.db.databaseName).toBe(fallbackDb.databaseName);
    } finally {
      await mongoose.disconnect();
      await client.close();
      await mongod.stop();
      jest.dontMock("config");
      jest.resetModules();
    }
  });
});
