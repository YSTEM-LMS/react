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
const router = express.Router({ mergeParams: true });
const requireAuth = require('../middleware/requireAuth');
const challengeStore = require('../utils/challengeStore');

/**
 * POST /challenge
 * Body: { fromUsername, toUsername }
 * Creates a pending challenge and returns its id + the reserved gameId.
 */
router.post('/', requireAuth, (req, res) => {
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

    const { challenge, created } = challengeStore.create(fromUsername, toUsername);
    return res.status(created ? 201 : 200).json({ challengeId: challenge.id, gameId: challenge.gameId });
});

/**
 * GET /challenge/incoming/:username
 * Pending challenges addressed to this user (recipient short-poll).
 */
router.get('/incoming/:username', requireAuth, (req, res) => {
    const { username } = req.params;

    // Enforce identity: caller can only inspect their own incoming challenges unless admin
    if (req.user.role !== 'admin' && req.user.username !== username) {
        return res.status(403).json({ error: "Forbidden: cannot read another user's challenges" });
    }

    return res.status(200).json({ challenges: challengeStore.listIncoming(username) });
});

/**
 * GET /challenge/:id
 * Current status of a challenge (challenger short-polls for acceptance).
 */
router.get('/:id', requireAuth, (req, res) => {
    const challenge = challengeStore.get(req.params.id);
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
 */
router.post('/:id/accept', requireAuth, (req, res) => {
    const challenge = challengeStore.get(req.params.id);
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
    const acceptedChallenge = challengeStore.accept(challenge.id);
    return res.status(200).json({
        gameId: acceptedChallenge.gameId,
        challenger: acceptedChallenge.fromUsername,
        opponent: acceptedChallenge.toUsername,
    });
});

/**
 * POST /challenge/:id/decline
 */
router.post('/:id/decline', requireAuth, (req, res) => {
    const challenge = challengeStore.get(req.params.id);
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
    challengeStore.decline(challenge.id);
    return res.status(200).json({ message: 'declined' });
});

module.exports = router;
// Exported for unit tests — resets the in-memory store between cases.
module.exports._reset = () => challengeStore.reset();
