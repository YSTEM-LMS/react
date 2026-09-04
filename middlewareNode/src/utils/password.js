/**
 * Centralized password hashing.
 *
 * Every account was previously hashed with a single unsalted pass of
 * SHA-384 (routes/auth.js, routes/users.js), duplicated inline at five
 * separate call sites. Unsalted SHA-384 is a fast, general-purpose hash,
 * not a password-storage algorithm: identical passwords produce identical
 * hashes, and it can be brute-forced at billions of guesses/second on a
 * GPU. If the users collection were ever exposed, effectively every
 * password in it would be crackable.
 *
 * New passwords are hashed with bcryptjs (pure JS, no native build step —
 * this repo's Dockerfiles are all `FROM node:alpine` with no build tools
 * installed, and a native bcrypt/argon2 binding would be the first
 * natively-compiled dependency in the stack, which is a real Alpine/musl
 * build risk here, not a hypothetical one).
 *
 * Existing accounts stay on the legacy SHA-384 hash until they log in
 * successfully once, at which point verifyAndMaybeUpgrade() returns an
 * upgraded bcrypt hash for the caller to persist. This migrates the
 * active user base with no forced mass password reset and no downtime.
 * Accounts that never log in again stay on the legacy hash indefinitely —
 * that's a known, deliberate tradeoff of lazy migration, not an oversight;
 * privileged (role === "admin") or long-dormant accounts should be
 * migrated proactively rather than relying on this path alone.
 */

const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const BCRYPT_COST_FACTOR = 10;
const LEGACY_SHA384_HEX_PATTERN = /^[0-9a-f]{96}$/i;

function legacyHash(plaintext) {
  return crypto.createHash("sha384").update(plaintext).digest("hex");
}

function isLegacyFormat(storedHash) {
  return typeof storedHash === "string" && LEGACY_SHA384_HEX_PATTERN.test(storedHash);
}

/** Hash a new or changed password. Always produces a bcrypt hash. */
async function hashPassword(plaintext) {
  return bcrypt.hash(plaintext, BCRYPT_COST_FACTOR);
}

/**
 * Verifies a plaintext password against a stored hash of either format.
 *
 * Returns { ok, upgradedHash }. When ok is true and upgradedHash is
 * non-null, the caller MUST persist upgradedHash as the account's new
 * password value — that's the migration actually happening.
 */
async function verifyAndMaybeUpgrade(plaintext, storedHash) {
  if (isLegacyFormat(storedHash)) {
    const ok = legacyHash(plaintext) === storedHash;
    if (!ok) {
      return { ok: false, upgradedHash: null };
    }
    const upgradedHash = await hashPassword(plaintext);
    return { ok: true, upgradedHash };
  }

  const ok = await bcrypt.compare(plaintext, storedHash);
  return { ok, upgradedHash: null };
}

module.exports = {
  hashPassword,
  verifyAndMaybeUpgrade,
  isLegacyFormat,
};
