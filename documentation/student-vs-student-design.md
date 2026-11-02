# Design: Student-vs-Student Play + Chess Score

**Author:** Sarita Himthani
**Status:** Implemented — reward model settled with Karthik (see §7)
**Related:** gamification (Karthik), chess board integration PR `merge-chessclient-refactor`

---

## 1. Goal

Let two **students** play a chess game against each other from their profile
pages. When the game ends, the result is recorded and shown as a **separate
chess score** on the leaderboard.

Chosen v1 matchmaking model: **direct challenge by username** (a student
challenges a named student; the other accepts). No queue, no auto-pairing.

### Reward model — decided

The original draft proposed **weavels**, a spendable coin balance. That was
**dropped**: nothing is planned for students to buy, so a currency would be a
dead end — a second unit measuring the same thing as score.

Instead a win contributes to a **chess score**, and that score is a **column of
its own**, not added into the existing leaderboard score:

- The existing leaderboard score is a blended **engagement** number (time,
  streak, activities, badges) — and its weighting is itself still an
  unconfirmed placeholder.
- A chess result is a different signal: **competitive skill**, not engagement.
- Merging them would make one number mean two things, and would compound one
  open weighting question into two.

Placeholder weights, deliberately smaller than the engagement weights because
this is an unvalidated signal: **+3 win / +1 draw / 0 loss**
(`PVP_WEIGHT_WIN` / `PVP_WEIGHT_DRAW` / `PVP_WEIGHT_LOSS`).

---

## 2. What exists today (verified in code)

| Piece | State | Reference |
|---|---|---|
| Multiplayer chess server | ✅ Works, but **student/mentor** shaped | `chessServer/src/managers/GameManager.js` |
| Two players join one game | ✅ `createOrJoinGame({student, mentor, role, socketId})` | GameManager |
| Move sync between players | ✅ `move` socket event | `chessServer/src/managers/EventHandlers.js` |
| **Winner / game-over detection** | ❌ **Missing** — `makeMove` never checks `isCheckmate`/`isGameOver` | GameManager `makeMove` |
| Activity events → gamification | ✅ Server already emits e.g. `completeActivity`, capture/castle events | EventHandlers `move` handler |
| Game-result storage + scoring | ✅ Added here — `GameResults` model, `POST /gameResults`, `getChessRecord` | `middlewareNode/src/routes/gameResults.js` |
| Student-vs-student entry / matchmaking | ❌ Does not exist — profile has only Lessons / Games / Play Computer | `NewStudentProfile.tsx` |

**Two gaps were mine** (winner detection, PvP play). The third — how a result
turns into a reward — was resolved with Karthik as a scoring question rather
than a currency one, so it is implemented here too (§7). The board being
embedded in the profile depends on the separate `merge-chessclient-refactor`
PR landing first.

---

## 3. Ownership split

| # | Work | Owner |
|---|---|---|
| 1 | Student-vs-student play (challenge UI + wire to `createOrJoinGame`) | **Sarita** |
| 2 | Game-result detection in `chessServer` (emit winner on game over) | **Sarita** |
| 3 | Game-result storage + chess score (`/gameResults`, leaderboard column) | **Sarita** |
| 4 | Existing engagement-score weighting (unchanged by this work) | **Karthik** |

---

## 4. Proposed flow

```
Student A profile ──"Challenge princel04"──▶ middleware ──▶ notify Student B
                                                              │
                          Student B: [Accept] ◀───────────────┘
                                     │
                     both clients open the chess board with a shared gameId
                                     │
                        chessServer.createOrJoinGame (see §5 note)
                                     │
                         ...they play; moves sync over socket...
                                     │
                   a move produces checkmate  ──▶  chessServer detects it (§6)
                                     │
                   emit  "gameover" { winnerUsername, reason }
                                     │
          report step (§7): POST /gameResults  (idempotent on gameId)
                                     │
   both clients show the result; the leaderboard's Chess column reflects it
```

---

## 5. Part 1 — Student-vs-student play (Sarita)

### 5a. Server model change
`createOrJoinGame` is hardcoded to one `student` + one `mentor` slot with fixed
colors. Two options for two students:

- **Option A (minimal):** reuse the existing slots — treat the challenger as the
  `mentor` slot and the opponent as the `student` slot internally. Fastest, but
  leaks confusing role names into a student-vs-student game.
- **Option B (clean, recommended):** generalize the game to
  `players: [{ username, id, color }, { username, id, color }]` keyed by a
  `gameId`, and keep the student/mentor path as a thin wrapper for backward
  compatibility. More work but removes the role confusion and makes
  matchmaking-by-gameId natural.

**Recommendation:** Option B, but ship Option A behind a `gameId` first if we're
time-constrained, then refactor.

### 5b. Challenge handshake (middleware + frontend)
- New middleware endpoints (draft):
  - `POST /challenge` `{ fromUsername, toUsername }` → creates a pending challenge, returns `gameId`.
  - `POST /challenge/:id/accept` → marks accepted, both sides get `gameId`.
  - `POST /challenge/:id/decline`.
  - Delivery of the incoming challenge to Student B: reuse existing socket
    connection if there is one, else short-poll. (Confirm what real-time channel
    already exists — the chess socket server is per-game, so challenge delivery
    may need its own lightweight channel.)
- Frontend: a **"Play a Student"** entry in `NewStudentProfile.tsx` (new inventory
  tile next to "Play with Computer") → opponent username input → send challenge →
  on accept, open the board with `?gameId=...&role=...`.

### 5c. Board wiring
Reuse the chess client's existing `userinfo` postMessage
(`{command:'userinfo', student, mentor, role}`) — extend/replace it to carry the
shared `gameId` and both usernames so both clients join the **same** game.

---

## 6. Part 2 — Winner detection (Sarita, chessServer)

`makeMove` already applies the move via chess.js `board.move()`. chess.js
exposes everything needed — just add a check after a successful move:

```js
// in GameManager.makeMove, after board.move() succeeds:
let outcome = null;
if (board.isCheckmate()) {
  // the side that just moved won; board.turn() is now the loser's color
  const loserColor = board.turn();               // 'w' | 'b'
  outcome = { over: true, reason: "checkmate", loserColor };
} else if (board.isDraw() || board.isStalemate() || board.isThreefoldRepetition()) {
  outcome = { over: true, reason: "draw" };
}
// return `outcome` alongside the existing result
```

Then in the `move` handler in `EventHandlers.js`, if `outcome.over`, resolve the
winning **username** from the game's players and emit to both sockets:

```js
io.to(playerA.id).emit("gameover", payload);
io.to(playerB.id).emit("gameover", payload);
// payload = { winnerUsername, loserUsername, reason }  // reason may be "draw"
```

Also handle **resignation** (add a `resign` socket event) and **disconnect**
(the existing `disconnect` handler resets the game — decide whether a disconnect
counts as a loss). These are the non-checkmate ways a game ends.

This mirrors the server's existing pattern of emitting activity events
(`completeActivity`, captures) that the gamification side already consumes.

---

## 7. Part 3 — Recording the result and scoring it

The `gameover` event triggers one side-effect: the chessServer reports the
finished game to the middleware. No balance is credited — the result is stored
and the score is derived from it.

**v2 update** ("PvP game results: server-authoritative reporting"): there is
no player-facing write anymore. Only the chess server can report a result,
authenticated with its own service credential, and only for a game the
middleware already knows was accepted by two real players. See §10 for why.

### Route naming

`/gameResults` — plural, resource-first, matching the existing `/leaderboard`,
`/badges`, `/activities` convention. The chess server's own write path is
nested under `/internal` to mark it as not player-facing.

### Contract

```
POST /internal/gameResults   (requireServiceKey — X-Service-Key: CHESS_SERVICE_KEY)

  win:   { gameId, result: "win",  reason: "checkmate"|"resign"|"disconnect",
           winnerUsername, loserUsername, playedAt? }
  draw:  { gameId, result: "draw", reason: "draw", players: [a, b], playedAt? }

  -> 201 { success, duplicate: false, gameResult }   // gameResult.source: "chessServer"
  -> 200 { success, duplicate: true,  gameResult }   // already recorded
  -> 404 unknown gameId (no accepted PvpGame)
  -> 400 reported players don't match the accepted game

GET /gameResults/:username    (requireAuth — any logged-in role)
  -> { success, data: { wins, draws, losses, gamesPlayed, chessScore } }

GET /challenge/game/:gameId   (requireAuth)
  -> { gameId, you, white, black, status }   // `you` is derived from the caller's own JWT
  -> 403 if the caller is not one of the two players; 404 if unknown
```

### Why a record, not a counter

`GameResults` stores one **immutable record per finished game**. Wins, draws,
losses and the chess score are **computed on read** from those records — the
same approach the leaderboard already uses for time, streak, activities and
badges (`utils/studentStats`).

That matters because the weights are still placeholders: retuning them
re-scores all history immediately, with nothing to backfill and no mutable
counter that can drift away from the games that produced it.

The scoring formula lives in exactly one place — `chessScoreFrom` in
`utils/studentStats` — so the leaderboard, the admin analytics dashboard and
`GET /gameResults/:username` cannot disagree about a student's numbers.

### Where it surfaces

- `GET /leaderboard` → `chess_score` + `chess_record {wins, draws, losses,
  gamesPlayed}` per row, and `sortBy=chess`. **Not** added into `score`.
- `GET /analytics/student/:username` → a sibling `chess` block, next to (not
  inside) `stats`.
- `LeaderboardModal.tsx` → a sortable **Chess** column showing the score with
  the W–D–L record beneath it.

### Idempotency

`gameId` is a unique index, which is also the idempotency key. A reconnect, a
retry, or both clients reporting the same game is a no-op. The unique-index
race (both clients report simultaneously) is caught and resolved as a
duplicate, not a 500.

---

## 8. Dependencies & sequencing

1. **Settled:** §7 — the reward model is decided and implemented; there is no
   longer a stub or an external contract to wait on.
2. **Blocked on chess board PR:** embedding the board in the student profile
   depends on `merge-chessclient-refactor` (or its cleaned-up successor) merging.
   Until then, PvP can be developed against the standalone chess client.
3. Order followed: §6 winner detection → §5 PvP handshake + entry UI → §7
   result recording and scoring.

---

## 9. Testing

- Unit: `chessServer/src/tests/GameManager.test.js` — checkmate/draw/resign
  outcomes, winner resolution by color, PvP pairing by `white`/`black`.
- Unit: `chessServer/src/tests/EventHandlers.pvp.test.js` — `newpvpgame`
  rejects a client-claimed username that doesn't match the middleware's, seats
  only from the middleware's `white`/`black`, and a finished game reports
  exactly once with `CHESS_SERVICE_KEY`.
- Integration: two socket clients play a scholar's-mate line; assert both
  receive `gameover` with the correct `winnerUsername`.
- Result API: `middlewareNode/tests/internalGameResults.test.js` — service-key
  auth, unknown-gameId / player-mismatch rejection, idempotency on `gameId`
  (including the unique-index race). `middlewareNode/tests/gameResults.test.js`
  covers the read side and that the legacy player-facing POST is gone (404).
- Contract: `middlewareNode/tests/contract.chessServerReport.test.js` imports
  `chessServer/src/reporting/resultRequest.js` directly and sends its exact
  output through the real `/internal/gameResults` route (real service-key
  check, real models via mongodb-memory-server) — the two services can't pass
  their own tests in isolation while disagreeing with each other, which is how
  the v1 header bug went unnoticed.
- Challenge persistence: `middlewareNode/tests/challenge.pvpgame.test.js` —
  accepting a challenge persists exactly one `PvpGame`, and
  `GET /challenge/game/:gameId` returns it only to one of its two players.
- Separation: `middlewareNode/tests/leaderboard.test.js` asserts chess results
  never move the engagement `score`, and that `sortBy=chess` ranks
  independently of it.

---

## 10. Out of scope for v1

Matchmaking queue / ELO, spectators, rematch, anti-cheat, and any spendable
currency. Direct-challenge only.

**Closed in v2** ("PvP game results: server-authoritative reporting"): v1's
known limitation — a player's own token reported their own game's result, so a
losing player could report themselves a win — is gone. The chess server now
holds its own service credential (`CHESS_SERVICE_KEY`) and reports through
`POST /internal/gameResults`, which only the chess server can call. Identity
is verified where players join, not trusted from reporting: on `newpvpgame`
the chess server calls `GET /challenge/game/:gameId` with the joining player's
own JWT and seats them under the username the middleware's own auth resolves,
never the username the client claims. A result is only accepted if its
winner/loser match the `PvpGame` the middleware recorded when the challenge
was accepted — so a fabricated `gameId` or mismatched players is rejected
before anything is stored. See §7 for the current contract.

Still out of scope: win trading between two cooperating real accounts (a
separate follow-up plan), matchmaking, ELO, spectators and rematch (unchanged
from v1, still gated on usage data this fix makes possible to collect).
