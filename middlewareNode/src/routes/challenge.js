/**
 * Challenge Routes — student-vs-student matchmaking (v1: direct challenge).
 *
 * A student challenges another student by username. The challenge is a short-
 * lived, in-memory record: when the opponent accepts, both sides receive a
 * shared `gameId` and open the chess board with it (the chessServer then pairs
 * them via `newpvpgame`). See documentation/student-vs-student-design.md §5b.
 *
 * v1 delivery is short-poll: the recipient polls GET /challenge/incoming/:username,
 * the challenger polls GET /challenge/:id for acceptance. No queue, no auto-pairing.
 * Challenges are intentionally NOT persisted — they expire and are meaningless
 * after the game opens.
 */

const express = require('express');
const crypto = require('crypto');
const requireAuth = require('../middleware/requireAuth');
const PvpGame = require('../models/PvpGame');
const router = express.Router({ mergeParams: true });

// challengeId -> { id, gameId, fromUsername, toUsername, status, createdAt }
// status: "pending" | "accepted" | "declined"
const challenges = new Map();

// How long a pending/answered challenge lives before it's swept (ms).
const CHALLENGE_TTL_MS = 2 * 60 * 1000;

/**
 * Drops challenges older than the TTL so the map can't grow without bound.
 * Called opportunistically on each request — no background timer to leak.
 */
function sweepExpired() {
    const cutoff = Date.now() - CHALLENGE_TTL_MS;
    for (const [id, c] of challenges) {
        if (c.createdAt < cutoff) {
            challenges.delete(id);
        }
    }
}

/**
 * POST /challenge
 * Body: { fromUsername, toUsername }
 * Creates a pending challenge and returns its id + the reserved gameId.
 */
router.post('/', requireAuth, (req, res) => {
    sweepExpired();
    const { fromUsername, toUsername } = req.body || {};

    if (!fromUsername || !toUsername) {
        return res.status(400).json({ error: 'fromUsername and toUsername are required' });
    }
    if (fromUsername === toUsername) {
        return res.status(400).json({ error: 'You cannot challenge yourself' });
    }

    // Enforce identity: caller must match fromUsername unless admin
    if (req.user.role !== 'admin' && req.user.username !== fromUsername) {
        return res.status(403).json({ error: 'Forbidden: cannot create challenge for another user' });
    }

    // Prevent stacking duplicate live challenges between the same pair.
    for (const c of challenges.values()) {
        if (
            c.status === 'pending' &&
            c.fromUsername === fromUsername &&
            c.toUsername === toUsername
        ) {
            return res.status(200).json({ challengeId: c.id, gameId: c.gameId });
        }
    }

    const challenge = {
        id: crypto.randomUUID(),
        gameId: crypto.randomUUID(),
        fromUsername,
        toUsername,
        status: 'pending',
        createdAt: Date.now(),
    };
    challenges.set(challenge.id, challenge);

    return res.status(201).json({ challengeId: challenge.id, gameId: challenge.gameId });
});

/**
 * GET /challenge/incoming/:username
 * Pending challenges addressed to this user (recipient short-poll).
 */
router.get('/incoming/:username', requireAuth, (req, res) => {
    sweepExpired();
    const { username } = req.params;

    // Enforce identity: caller can only inspect their own incoming challenges unless admin
    if (req.user.role !== 'admin' && req.user.username !== username) {
        return res.status(403).json({ error: "Forbidden: cannot read another user's challenges" });
    }

    const incoming = [];
    for (const c of challenges.values()) {
        if (c.status === 'pending' && c.toUsername === username) {
            incoming.push({ challengeId: c.id, fromUsername: c.fromUsername, gameId: c.gameId });
        }
    }
    return res.status(200).json({ challenges: incoming });
});

/**
 * GET /challenge/:id
 * Current status of a challenge (challenger short-polls for acceptance).
 */
router.get('/:id', requireAuth, (req, res) => {
    sweepExpired();
    const challenge = challenges.get(req.params.id);
    if (!challenge) {
        return res.status(404).json({ error: 'Challenge not found or expired' });
    }

    // Enforce identity: caller must be a participant in this challenge unless admin
    if (
        req.user.role !== 'admin' &&
        req.user.username !== challenge.fromUsername &&
        req.user.username !== challenge.toUsername
    ) {
        return res.status(403).json({ error: 'Forbidden: cannot access this challenge' });
    }

    return res.status(200).json({
        challengeId: challenge.id,
        status: challenge.status,
        gameId: challenge.gameId,
        fromUsername: challenge.fromUsername,
        toUsername: challenge.toUsername,
    });
});

/**
 * POST /challenge/:id/accept
 * Opponent accepts; both sides now share `gameId`.
 *
 * Also persists a PvpGame record (white = challenger, black = opponent) —
 * this is the middleware's own record of who the two real players are, so
 * GET /challenge/game/:gameId can later verify a joining chess-server socket
 * against it instead of trusting a client-supplied username. See the PvP
 * results plan (v2), target design.
 */
router.post('/:id/accept', requireAuth, async (req, res) => {
    sweepExpired();
    const challenge = challenges.get(req.params.id);
    if (!challenge) {
        return res.status(404).json({ error: 'Challenge not found or expired' });
    }

    // Enforce identity: only the recipient (toUsername) can accept the challenge
    if (req.user.role !== 'admin' && req.user.username !== challenge.toUsername) {
        return res.status(403).json({ error: 'Forbidden: only the challenged player can accept' });
    }

    if (challenge.status !== 'pending') {
        return res.status(409).json({ error: `Challenge already ${challenge.status}` });
    }
    challenge.status = 'accepted';

    try {
        await PvpGame.create({
            gameId: challenge.gameId,
            white: challenge.fromUsername,
            black: challenge.toUsername,
        });
    } catch (err) {
        // Unique-index race: two accepts for the same challenge can't both get
        // here in practice (the in-memory status guard above already blocks a
        // second accept), but if they somehow did, the duplicate key means a
        // PvpGame already exists for this gameId — nothing more to do.
        if (!err || err.code !== 11000) {
            console.error('challenge accept — failed to save PvpGame:', err && err.message);
            return res.status(500).json({ error: 'Server error' });
        }
    }

    return res.status(200).json({
        gameId: challenge.gameId,
        challenger: challenge.fromUsername,
        opponent: challenge.toUsername,
    });
});

/**
 * GET /challenge/game/:gameId
 * Lets the chess server verify who the two real players in a game are before
 * seating a joining socket. Behind requireAuth: the caller's own JWT decides
 * `you`, so a socket can never claim to be someone else's seat.
 */
router.get('/game/:gameId', requireAuth, async (req, res) => {
    const game = await PvpGame.findOne({ gameId: req.params.gameId });
    if (!game) {
        return res.status(404).json({ error: 'Game not found' });
    }
    const you = req.user.username;
    if (you !== game.white && you !== game.black) {
        return res.status(403).json({ error: 'You are not a player in this game' });
    }
    return res.status(200).json({
        gameId: game.gameId,
        you,
        white: game.white,
        black: game.black,
        status: game.status,
    });
});

/**
 * POST /challenge/:id/decline
 */
router.post('/:id/decline', requireAuth, (req, res) => {
    sweepExpired();
    const challenge = challenges.get(req.params.id);
    if (!challenge) {
        return res.status(404).json({ error: 'Challenge not found or expired' });
    }

    // Enforce identity: only participants can decline/cancel
    if (
        req.user.role !== 'admin' &&
        req.user.username !== challenge.toUsername &&
        req.user.username !== challenge.fromUsername
    ) {
        return res.status(403).json({ error: 'Forbidden: only challenge participants can decline' });
    }

    if (challenge.status !== 'pending') {
        return res.status(409).json({ error: `Challenge already ${challenge.status}` });
    }
    challenge.status = 'declined';
    return res.status(200).json({ message: 'declined' });
});

module.exports = router;
// Exported for unit tests — resets the in-memory store between cases.
module.exports._reset = () => challenges.clear();
