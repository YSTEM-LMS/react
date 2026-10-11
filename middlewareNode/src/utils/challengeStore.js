const crypto = require('crypto');

const challenges = new Map();
const CHALLENGE_TTL_MS = 2 * 60 * 1000;

function sweepExpired() {
    const cutoff = Date.now() - CHALLENGE_TTL_MS;
    for (const [id, challenge] of challenges) {
        if (challenge.createdAt < cutoff) {
            challenges.delete(id);
        }
    }
}

function create(fromUsername, toUsername) {
    sweepExpired();
    for (const challenge of challenges.values()) {
        if (
            challenge.status === 'pending' &&
            challenge.fromUsername === fromUsername &&
            challenge.toUsername === toUsername
        ) {
            return { challenge, created: false };
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
    return { challenge, created: true };
}

function listIncoming(username) {
    sweepExpired();
    return Array.from(challenges.values())
        .filter((challenge) => challenge.status === 'pending' && challenge.toUsername === username)
        .map((challenge) => ({
            challengeId: challenge.id,
            fromUsername: challenge.fromUsername,
            gameId: challenge.gameId,
        }));
}

function get(id) {
    sweepExpired();
    return challenges.get(id);
}

function accept(id) {
    const challenge = get(id);
    if (!challenge || challenge.status !== 'pending') {
        return null;
    }
    challenge.status = 'accepted';
    return challenge;
}

function decline(id) {
    const challenge = get(id);
    if (!challenge || challenge.status !== 'pending') {
        return null;
    }
    challenge.status = 'declined';
    return challenge;
}

function reset() {
    challenges.clear();
}

module.exports = { create, listIncoming, get, accept, decline, reset };
