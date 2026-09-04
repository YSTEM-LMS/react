/**
 * Unit tests for the centralized password-hashing utility
 * (src/utils/password.js). No mocking needed — pure functions.
 */

const { hashPassword, verifyAndMaybeUpgrade, isLegacyFormat } = require("../src/utils/password");
const crypto = require("crypto");

const legacyHash = (plaintext) => crypto.createHash("sha384").update(plaintext).digest("hex");

describe("utils/password", () => {
  describe("isLegacyFormat", () => {
    test("recognizes a 96-char SHA-384 hex digest as legacy", () => {
      expect(isLegacyFormat(legacyHash("anything"))).toBe(true);
    });

    test("does not recognize a bcrypt hash as legacy", async () => {
      const bcryptHash = await hashPassword("anything");
      expect(isLegacyFormat(bcryptHash)).toBe(false);
    });

    test("does not blow up on non-string input", () => {
      expect(isLegacyFormat(undefined)).toBe(false);
      expect(isLegacyFormat(null)).toBe(false);
    });
  });

  describe("hashPassword", () => {
    test("produces a bcrypt-formatted hash, never the legacy format", async () => {
      const hashed = await hashPassword("correcthorsebatterystaple");
      expect(hashed).toMatch(/^\$2[aby]?\$/);
      expect(isLegacyFormat(hashed)).toBe(false);
    });

    test("produces a different hash each time (salted)", async () => {
      const a = await hashPassword("samepassword");
      const b = await hashPassword("samepassword");
      expect(a).not.toBe(b);
    });
  });

  describe("verifyAndMaybeUpgrade — legacy stored hash", () => {
    test("correct password verifies and returns a bcrypt upgrade hash", async () => {
      const stored = legacyHash("mypassword");
      const result = await verifyAndMaybeUpgrade("mypassword", stored);

      expect(result.ok).toBe(true);
      expect(result.upgradedHash).not.toBeNull();
      expect(isLegacyFormat(result.upgradedHash)).toBe(false);
    });

    test("the returned upgrade hash itself verifies the same password", async () => {
      const stored = legacyHash("mypassword");
      const { upgradedHash } = await verifyAndMaybeUpgrade("mypassword", stored);

      const second = await verifyAndMaybeUpgrade("mypassword", upgradedHash);
      expect(second.ok).toBe(true);
      expect(second.upgradedHash).toBeNull();
    });

    test("wrong password fails and offers no upgrade", async () => {
      const stored = legacyHash("mypassword");
      const result = await verifyAndMaybeUpgrade("wrongpassword", stored);

      expect(result.ok).toBe(false);
      expect(result.upgradedHash).toBeNull();
    });
  });

  describe("verifyAndMaybeUpgrade — bcrypt stored hash", () => {
    test("correct password verifies with no further upgrade", async () => {
      const stored = await hashPassword("mypassword");
      const result = await verifyAndMaybeUpgrade("mypassword", stored);

      expect(result.ok).toBe(true);
      expect(result.upgradedHash).toBeNull();
    });

    test("wrong password fails", async () => {
      const stored = await hashPassword("mypassword");
      const result = await verifyAndMaybeUpgrade("wrongpassword", stored);

      expect(result.ok).toBe(false);
      expect(result.upgradedHash).toBeNull();
    });
  });
});
