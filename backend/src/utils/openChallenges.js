/**
 * openChallenges — in-memory store for open (broadcast) challenges.
 *
 * No DB or schema changes required.
 * NOTE: challenges are lost on server restart (acceptable for hackathon scope).
 */

const { randomUUID } = require('crypto');

// Map<id, challenge>
const store = new Map();

/**
 * Create a new open challenge.
 * @param {string} fromUserId
 * @param {string} fromUserName
 * @param {string|Date} proposedTime
 * @param {string} [message]
 * @returns {object} challenge
 */
function create(fromUserId, fromUserName, proposedTime, message = '') {
    const id = randomUUID();
    const challenge = {
        id,
        fromUserId,
        fromUserName,
        proposedTime: new Date(proposedTime).toISOString(),
        message,
        status: 'open',
        acceptedBy: null,
        acceptedByName: null,
        createdAt: new Date().toISOString(),
    };
    store.set(id, challenge);
    return challenge;
}

/**
 * List all open challenges that haven't expired or been accepted/cancelled.
 * @returns {object[]}
 */
function list() {
    const now = new Date();
    const results = [];
    for (const challenge of store.values()) {
        if (challenge.status === 'open' && new Date(challenge.proposedTime) > now) {
            results.push(challenge);
        }
    }
    return results.sort((a, b) => new Date(a.proposedTime) - new Date(b.proposedTime));
}

/**
 * Accept an open challenge.
 * @param {string} id
 * @param {string} acceptorUserId
 * @param {string} acceptorName
 * @returns {{ ok: boolean, error?: string, challenge?: object }}
 */
function accept(id, acceptorUserId, acceptorName) {
    const challenge = store.get(id);
    if (!challenge) return { ok: false, error: 'Challenge not found' };
    if (challenge.fromUserId === acceptorUserId) return { ok: false, error: 'Cannot accept your own challenge' };
    if (challenge.status !== 'open') return { ok: false, error: `Challenge is already ${challenge.status}` };
    if (new Date(challenge.proposedTime) <= new Date()) return { ok: false, error: 'Challenge has expired' };

    challenge.status = 'accepted';
    challenge.acceptedBy = acceptorUserId;
    challenge.acceptedByName = acceptorName;
    return { ok: true, challenge };
}

/**
 * Cancel an open challenge (creator only).
 * @param {string} id
 * @param {string} userId
 * @returns {{ ok: boolean, error?: string }}
 */
function cancel(id, userId) {
    const challenge = store.get(id);
    if (!challenge) return { ok: false, error: 'Challenge not found' };
    if (challenge.fromUserId !== userId) return { ok: false, error: 'Only the creator can cancel this challenge' };
    if (challenge.status !== 'open') return { ok: false, error: `Challenge is already ${challenge.status}` };

    store.delete(id);
    return { ok: true };
}

/**
 * Get a single challenge by id (used in tests / debugging).
 * @param {string} id
 * @returns {object|undefined}
 */
function get(id) {
    return store.get(id);
}

/** Clear all challenges — used in tests only. */
function _reset() {
    store.clear();
}

module.exports = { create, list, accept, cancel, get, _reset };
