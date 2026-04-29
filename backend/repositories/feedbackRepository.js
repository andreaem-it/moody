/**
 * feedbackRepository
 * PostgreSQL migration: replace getDb() with a pg client; keep same interface.
 */

const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');

const feedbackRepository = {
  create(eventId, userId, type) {
    const id = uuidv4();
    const now = new Date().toISOString();
    getDb()
      .prepare('INSERT INTO feedback (id, eventId, userId, type, createdAt) VALUES (?, ?, ?, ?, ?)')
      .run(id, eventId, userId, type, now);
    return { id, eventId, userId, type, createdAt: now };
  },

  /**
   * Returns how many times `userId` has skipped events containing `vibe`.
   * Used by profileService to detect repeated vibe aversion (3 skips → remove vibe).
   *
   * Note: vibes are stored as JSON strings like '["music","social"]',
   * so the LIKE pattern `%"vibe"%` reliably matches the quoted value.
   */
  countSkipsForVibe(userId, vibe) {
    return getDb()
      .prepare(`
        SELECT COUNT(*) as c
        FROM feedback f
        INNER JOIN events e ON f.eventId = e.id
        WHERE f.userId = ? AND f.type = 'skip' AND e.vibes LIKE ?
      `)
      .get(userId, `%"${vibe}"%`).c;
  },
};

module.exports = feedbackRepository;
