/**
 * Dev-Only Demo Account Seeder
 *
 * Creates (or resets) the "mentor" and "student" demo accounts used for
 * manual local development, so a developer can open the app and click
 * around as either role without running the signup flow first.
 *
 * This replaces the old approach of a fixed, hardcoded password
 * (`123123123`) that was created automatically on every server start and
 * published in the README. That's what let it end up guessable and public
 * for years. This script is the opposite on every axis:
 *
 *   - Opt-in only. Nothing calls this automatically. Run it yourself:
 *       npm run seed:dev
 *   - Every run generates a brand-new random password for both accounts,
 *     whether the account already exists or not. There is no static value
 *     to leak, and an old password stops working the moment you rotate it
 *     by running this again.
 *   - The password is printed to the terminal only. It is never written to
 *     a file, never logged anywhere persistent, and never committed.
 *   - Refuses to run at all if NODE_ENV=production, matching the same
 *     fail-loud posture already used in src/config/validateEnvironment.js.
 *
 * Usage:
 *   npm run seed:dev
 *   (or, directly: node src/scripts/seedDevAccounts.js)
 *
 * Requires MONGO_URI (or a local config/default.json) pointing at a real,
 * disposable development database. Never point this at production data.
 */

require("dotenv").config();
const mongoose = require("mongoose");
const config = require("config");
const crypto = require("crypto");
const Users = require("../models/users");

if (process.env.NODE_ENV === "production") {
  console.error(
    "Refusing to seed demo accounts in production. This script is for local development only."
  );
  process.exit(1);
}

/**
 * 16 bytes of randomness, base64url-encoded so it's safe to read off a
 * terminal or type back in by hand if needed.
 */
function generatePassword() {
  return crypto.randomBytes(16).toString("base64url");
}

/**
 * Matches the hashing scheme every login/signup route already uses
 * (routes/auth.js, routes/users.js). This script's job is to stay
 * consistent with that scheme, not to change it.
 */
function hashPassword(plaintext) {
  return crypto.createHash("sha384").update(plaintext).digest("hex");
}

async function upsertDemoAccount({ username, role, mentorshipUsername, firstName, lastName, email }) {
  const plaintextPassword = generatePassword();
  const hashedPassword = hashPassword(plaintextPassword);

  await Users.findOneAndUpdate(
    { username },
    {
      $set: {
        password: hashedPassword,
        role,
        mentorshipUsername,
        firstName,
        lastName,
        email,
      },
      $setOnInsert: {
        accountCreatedAt: new Date().toLocaleString(),
        timePlayed: 0,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return plaintextPassword;
}

async function run() {
  await mongoose.connect(config.get("mongoURI"));
  console.log("Connected to MongoDB");

  const mentorPassword = await upsertDemoAccount({
    username: "mentor",
    role: "mentor",
    mentorshipUsername: "student",
    firstName: "Demo",
    lastName: "Mentor",
    email: "demo-mentor@ystemandchess.local",
  });

  const studentPassword = await upsertDemoAccount({
    username: "student",
    role: "student",
    mentorshipUsername: "mentor",
    firstName: "Demo",
    lastName: "Student",
    email: "demo-student@ystemandchess.local",
  });

  await mongoose.disconnect();

  console.log("");
  console.log("Demo accounts ready. These passwords are freshly generated for this run only,");
  console.log("they are shown here and nowhere else:");
  console.log("");
  console.log(`  mentor   / ${mentorPassword}`);
  console.log(`  student  / ${studentPassword}`);
  console.log("");
  console.log("Run `npm run seed:dev` again any time to rotate both passwords.");
}

run().catch((err) => {
  console.error("Seeding demo accounts failed:", err.message);
  process.exit(1);
});
