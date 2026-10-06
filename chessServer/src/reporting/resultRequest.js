/**
 * Builds the chess server's game-result report to the middleware.
 *
 * A pure function with no `require` calls, so middlewareNode's own tests can
 * import this file directly by relative path and assert against the exact
 * request it produces (see middlewareNode/tests/contract.chessServerReport.test.js,
 * the PvP results plan v2's T4b). If the header name or the path ever drifts
 * between the two services, that contract test fails in CI instead of both
 * sides quietly agreeing with themselves. See target design point 5.
 *
 * @param {Object} game - the finished game; supplies gameId and both players
 * @param {Object} outcome - { reason, winnerUsername?, loserUsername? }
 * @param {string} key - the shared secret (CHESS_SERVICE_KEY)
 * @returns {{ path: string, headers: Object, body: Object }}
 */
function buildResultRequest(game, outcome, key) {
  const isDraw = !outcome.winnerUsername;
  const body = isDraw
    ? {
        gameId: game.gameId,
        result: "draw",
        reason: "draw",
        players: game.players.map((p) => p.username),
      }
    : {
        gameId: game.gameId,
        result: "win",
        reason: outcome.reason,
        winnerUsername: outcome.winnerUsername,
        loserUsername: outcome.loserUsername,
      };

  return {
    path: "/internal/gameResults",
    headers: {
      "Content-Type": "application/json",
      "X-Service-Key": key,
    },
    body,
  };
}

module.exports = buildResultRequest;
