const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

// Fallback so jwt.sign() (used for login) doesn't throw "secretOrPrivateKey
// must have a value" in dev/test when INDEX_KEY isn't set — without checking
// a fixed signing key into git history. custom-environment-variables.json
// already maps INDEX_KEY onto this key, so any real deployment overrides it;
// validateEnvironment.js still requires INDEX_KEY in production, and runs
// before anything require()s this file, so this never touches disk in prod.
//
// Persisted (gitignored) rather than regenerated per boot, so dev JWTs and
// password-reset links survive a nodemon restart instead of invalidating on
// every file save.
const DEV_INDEX_KEY_PATH = path.join(__dirname, ".dev-index-key");

function getOrCreateDevIndexKey() {
  try {
    const existing = fs.readFileSync(DEV_INDEX_KEY_PATH, "utf8").trim();
    if (existing) return existing;
  } catch (_) {
    // File doesn't exist yet (or is unreadable) — generate below.
  }

  const generated = crypto.randomBytes(32).toString("hex");
  try {
    fs.writeFileSync(DEV_INDEX_KEY_PATH, generated, { mode: 0o600 });
  } catch (err) {
    console.warn(
      `[config] Failed to persist dev indexKey (${err.message}) — it will regenerate on restart.`
    );
  }
  return generated;
}

let devIndexKey = "";
if (!process.env.INDEX_KEY) {
  devIndexKey = getOrCreateDevIndexKey();
  console.warn(
    `[config] INDEX_KEY not set — using a dev-only key persisted at ${DEV_INDEX_KEY_PATH}. ` +
      "Set INDEX_KEY in your environment for production or shared setups."
  );
}

module.exports = {
  mongoURI: "",
  jwtSecret: "",
  indexKey: devIndexKey,

  corsOptions: {
    origin: "http://localhost:3000",
  },

  email: {
    user: "",
    pass: "",
  },

  user: "",
  senderEmail: "",

  clientId: "",
  clientSecret: "",
  redirectUri: "",
  refreshToken: "",

  basepath: "http://localhost:3000",

  azureStorageAccount: "",
  azureStorageKey: "",
  azureContainer: "",
  azureStorageRegion: "",

  appID: "",
  uid: "",
  customerId: "",
  customerCertificate: "",

  server: {
    port: 8000,
  },
};
