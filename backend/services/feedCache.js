/**
 * Simple in-memory feed cache.
 * Key: userId:context  TTL: 30 seconds
 * Invalidated on any feedback action by that user.
 */

const CACHE_TTL_MS  = 30_000;
const CACHE_MAX_SIZE = 200;   // cap for multi-user scenarios
const cache = new Map();

function get(userId, context) {
  const key = `${userId}:${context}`;
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function set(userId, context, data) {
  // Evict oldest entry when over the cap
  if (cache.size >= CACHE_MAX_SIZE) {
    cache.delete(cache.keys().next().value);
  }
  cache.set(`${userId}:${context}`, { data, ts: Date.now() });
}

function invalidate(userId) {
  for (const key of cache.keys()) {
    if (key.startsWith(`${userId}:`)) cache.delete(key);
  }
}

module.exports = { get, set, invalidate };
