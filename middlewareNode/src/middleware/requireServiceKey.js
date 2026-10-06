/**
 * Require Service Key Middleware
 *
 * Gates the chess server's internal result-reporting endpoint. The caller is
 * not a student — it's the chess server itself, authenticating with a shared
 * secret (CHESS_SERVICE_KEY) instead of a player JWT. See the PvP results
 * plan (v2), target design point 4.
 *
 * Uses crypto.timingSafeEqual to compare keys, which requires equal-length
 * buffers — lengths are compared first so a wrong-length key takes the same
 * code path as a wrong-value key instead of throwing.
 */

const crypto = require("crypto");

const requireServiceKey = (req, res, next) => {
  const expected = process.env.CHESS_SERVICE_KEY;
  const provided = req.headers["x-service-key"];

  if (!expected || !provided) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(provided);

  const matches =
    expectedBuf.length === providedBuf.length &&
    crypto.timingSafeEqual(expectedBuf, providedBuf);

  if (!matches) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
};

module.exports = requireServiceKey;
