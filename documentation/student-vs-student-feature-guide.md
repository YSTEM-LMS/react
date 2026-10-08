# Student-vs-Student Play + Chess Score — Feature Guide

How the student-vs-student feature works, how to test it, and how to replicate
the behavior locally.

**Status:** backend, challenge handshake and result scoring complete and tested;
in-profile board embedding pending (see [Pending](#what-works-today-vs-pending)).
**Related:** [student-vs-student-design.md](student-vs-student-design.md)

---

## 1. What we built (the flow)

Two students play chess from their profiles; the result feeds a **chess score**
shown as its own leaderboard column (deliberately not blended into the existing
engagement score — see the design doc §1). Three layers cooperate:

```
Student A profile ──"Challenge cara"──▶ middleware /challenge ──▶ B's incoming list
        (PlayStudent.tsx)                    (in-memory)                (B short-polls)
                                                                            │ Accept
        both sides now hold the same gameId, and the middleware
        saves a PvpGame {gameId, white: A, black: B, status: "active"} ◀───┘
                                    │
   each client ─"newpvpgame {gameId, username, credentials}"─▶ chessServer
                                    │  chessServer calls GET /challenge/game/:gameId
                                    │  with the player's own JWT, gets back {you, white, black}
                                    │  from the MIDDLEWARE's auth — never trusts the client's
                                    │  own claim. Mismatch → rejected, nobody seated.
                                    │  createOrJoinPvpGame pairs them from that response: white = white seat.
                        ...moves sync over sockets...
                                    │
        a move causes checkmate ──▶ detectOutcome() resolves winner BY COLOR
                                    │
        chessServer emits "gameover" {winnerUsername, loserUsername, reason} to BOTH
                                    │
        POST /internal/gameResults (X-Service-Key: CHESS_SERVICE_KEY) ──▶
          middleware checks winner/loser match the saved PvpGame, then stores
          one immutable record, idempotent on gameId, source: "chessServer"
                                    │
        leaderboard / analytics compute W-D-L + chessScore on read
```

Players never write their own result — only the chess server can, and only
for a game the middleware already knows two real players accepted. See the
design doc §7 and §10.

### Key files

| File | Responsibility |
|---|---|
| `react-ystemandchess/src/features/student/student-profile/PlayStudent.tsx` | "Play a Student" tab: send challenge, poll for acceptance, accept/decline incoming |
| `react-ystemandchess/.../Modals/LeaderboardModal.tsx` | Sortable **Chess** column (score + W–D–L), separate from Score |
| `middlewareNode/src/routes/challenge.js` | Challenge handshake endpoints (in-memory, TTL-swept); accept also saves a `PvpGame`; `GET /challenge/game/:gameId` lets the chess server verify a joining player |
| `middlewareNode/src/models/PvpGame.js` | The middleware's record of who the two real players in a `gameId` are; `active` → `finished` |
| `middlewareNode/src/middleware/requireServiceKey.js` | Gates `/internal/gameResults` on `CHESS_SERVICE_KEY` instead of a player JWT |
| `middlewareNode/src/routes/internalGameResults.js` | `POST /internal/gameResults` — the chess server's only write path, validated against the saved `PvpGame` |
| `middlewareNode/src/routes/gameResults.js` | `GET /gameResults/:username` only — no player-facing POST |
| `middlewareNode/src/models/gameResults.js` | One immutable record per finished game; `gameId` unique; `source: "chessServer" \| "legacy-unverified"` |
| `middlewareNode/src/utils/studentStats.js` | `getChessRecord` / `getChessRecords` / `chessScoreFrom` — the single scoring source |
| `chessServer/src/managers/GameManager.js` | `createOrJoinPvpGame` (seats from `white`/`black` only), `detectOutcome`, `resign`, the `isOver` latch |
| `chessServer/src/managers/EventHandlers.js` | `newpvpgame` (verifies identity via the middleware) / `resign` socket events, `emitGameOver` + `reportGameResult` |
| `chessServer/src/reporting/resultRequest.js` | Pure function building the `{path, headers, body}` the chess server sends; imported directly by the middleware's contract test |

---

## 2. Reproduce the automated verification (fastest)

### Unit tests — game logic (checkmate / draw / resign / PvP-join / no-double-award)

```bash
cd chessServer && npx jest src/tests/GameManager.test.js
cd chessServer && npx jest src/tests/EventHandlers.pvp.test.js   # identity verification + one report
```

### Result API — service-key auth, idempotency, scoring

```bash
cd middlewareNode && npx jest tests/internalGameResults.test.js   # the chess server's write path
cd middlewareNode && npx jest tests/gameResults.test.js           # read path + legacy POST is gone
cd middlewareNode && npx jest tests/challenge.pvpgame.test.js     # accept persists a PvpGame

# Cross-service: the chess server's actual request shape against the real route
cd middlewareNode && npx jest tests/contract.chessServerReport.test.js

# The separation guarantee (chess results never move the engagement score):
cd middlewareNode && npx jest tests/leaderboard.test.js
```

### End-to-end — real challenge router + real socket server, two clients play

```bash
# 1. start the chess server
cd chessServer && PORT=3001 node src/index.js   # leave running

# 2. in another shell, run the E2E driver
NODE_PATH=middlewareNode/node_modules:chessServer/node_modules \
  node <path-to>/e2e.js
# → 11/11 checks passed
```

The E2E script exercises the whole backend path (challenge → accept → join same
game → play to checkmate → resign → disconnect-forfeit) without a browser.

---

## 3. Exercise it manually in the browser

Run all services, each in its own terminal:

```bash
cd middlewareNode      && npm start   # :8000  (needs Mongo — the /challenge route is
                                      #         in-memory, but the server boots connectDB())
cd chessServer         && npm start   # :3001
cd react-ystemandchess && npm start   # :3000
```

Then:

1. Log in as **student A** in one browser and **student B** in another (use a
   second browser or an incognito window so the two `login` cookies don't collide).
2. Both go to their profile → **"Play a Student"** tab.
3. A types B's username → **Challenge**. A now shows "Waiting for B to accept…".
4. B's tab shows "**A challenged you**" within ~2.5s (short-poll) → **Accept**.
5. Both flip to "Ready to play — you are White/Black" with a shared `gameId`.
   **Open Board** launches the game.

### Watch just the handshake API (no browser)

```bash
# with middleware (or the E2E's in-process router) up:
curl -sX POST localhost:8000/challenge -H 'Content-Type: application/json' \
  -d '{"fromUsername":"alice","toUsername":"cara"}'          # → {challengeId, gameId}
curl -s localhost:8000/challenge/incoming/cara               # cara sees it
curl -sX POST localhost:8000/challenge/<challengeId>/accept  # → {gameId, challenger, opponent}
                                                               #   (also saves a PvpGame)

# either player can verify the game — this is what the chess server calls on join
curl -s localhost:8000/challenge/game/<gameId> -H "Authorization: Bearer $ALICE_TOKEN"
# → {gameId, you: "alice", white: "alice", black: "cara", status: "active"}
```

### Watch the result API (no browser)

Only the chess server can write a result now — a player's own token can't.

```bash
# record a game — chess server identity, not a player's token
curl -sX POST localhost:8000/internal/gameResults \
  -H 'Content-Type: application/json' -H "X-Service-Key: $CHESS_SERVICE_KEY" \
  -d '{"gameId":"g1","result":"win","reason":"checkmate",
       "winnerUsername":"alice","loserUsername":"cara"}'   # → 201 {duplicate:false}
# (requires a PvpGame already saved for "g1" — i.e. a real accepted challenge)

# report it again — idempotent, nothing changes
curl -sX POST localhost:8000/internal/gameResults \
  -H 'Content-Type: application/json' -H "X-Service-Key: $CHESS_SERVICE_KEY" \
  -d '{"gameId":"g1","result":"win","reason":"checkmate",
       "winnerUsername":"alice","loserUsername":"cara"}'   # → 200 {duplicate:true}

# a player's own token no longer works for writing — only reading
curl -s localhost:8000/gameResults/alice -H "Authorization: Bearer $TOKEN"
# → {wins, draws, losses, gamesPlayed, chessScore}

# the leaderboard shows it as its own column, and can rank by it
curl -s 'localhost:8000/leaderboard?sortBy=chess' -H "Authorization: Bearer $TOKEN"
```

---

## 4. What each test guarantees

| Check | Proven by |
|---|---|
| Winner resolved correctly (by color, both game types) | unit: Fool's-mate → `cara` wins |
| Draws detected, no winner | unit: insufficient-material |
| Resign / disconnect forfeit to opponent | unit + E2E |
| A joining player is seated under their own verified identity, not a client-claimed username | `EventHandlers.pvp.test.js` — mismatch rejected, seat comes from the middleware response only |
| No double-count after a decided game | unit: "cannot be resigned again" + `gameId` idempotency tests |
| Only the chess server (service key) can report a result | `internalGameResults.test.js` — 401 without/with wrong key |
| A result is only accepted for a real accepted game, with matching players | `internalGameResults.test.js` — 404 unknown gameId, 400 player mismatch |
| The two services agree on the report's shape without being mocked at each other | `contract.chessServerReport.test.js` |
| A player can no longer write their own result | `gameResults.test.js` — legacy POST returns 404 |
| Chess results never move the engagement score | `leaderboard.test.js` — separation tests |
| Full handshake → paired game → gameover on both clients | E2E 11/11 |

---

## 5. What works today vs. pending

**Works end-to-end today:** the entire **challenge handshake** — send / accept /
decline, live polling, self-challenge rejection, duplicate dedup — all of the
**game and outcome logic** (pairing by `gameId`, move sync, checkmate/draw/resign/
disconnect detection, single-count guarantee), **server-authoritative result
recording** (`POST /internal/gameResults`, service-key gated, validated against
the accepted `PvpGame` → leaderboard Chess column and analytics `chess` block),
and **identity verification on join** (a player is seated under the username
the middleware's own auth resolves, never a client-supplied one).

**Pending:**

- **In-profile board embedding.** "Open Board" currently targets the standalone
  chess client; embedding the board in the profile via `postMessage` waits on the
  chess-client refactor. Until a client emits `newpvpgame`, the reporting path is
  exercised by tests and the E2E driver rather than by real browser play.
- **Deploy.** `CHESS_SERVICE_KEY` needs to exist as a matching secret on both
  services in production before this reaches real traffic — see the PvP results
  plan (v2), T5. Until then, reports fail exactly as they do today (no regression,
  just no fix yet).
- **Win trading.** The v1 trust gap (a player reporting their own result) is
  closed, but two cooperating real accounts can still play and throw real games
  to farm chess score — see the separate "PvP follow-ups" plan.
