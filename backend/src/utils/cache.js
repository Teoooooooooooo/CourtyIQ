/**
 * Simple in-memory TTL cache to avoid redundant OpenAI calls.
 */

const cache = new Map();

function get(key) {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        cache.delete(key);
        return null;
    }
    return entry.value;
}

function set(key, value, ttlSeconds = 60) {
    cache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

function del(key) {
    cache.delete(key);
}

module.exports = { get, set, del };
