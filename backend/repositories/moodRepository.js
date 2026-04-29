/**
 * moodRepository
 * PostgreSQL migration: replace getDb() with a pg client; keep same interface.
 */

const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');

const moodRepository = {
  /**
   * Inserts or updates a mood vote (one vote per user per event).
   * Returns the affected row id.
   */
  upsert(eventId, userId, value) {
    const existing = getDb()
      .prepare('SELECT id FROM moods WHERE eventId = ? AND userId = ?')
      .get(eventId, userId);
    const now = new Date().toISOString();

    if (existing) {
      getDb()
        .prepare('UPDATE moods SET value = ?, updatedAt = ? WHERE id = ?')
        .run(value, now, existing.id);
      return existing.id;
    }

    const id = uuidv4();
    getDb()
      .prepare(
        'INSERT INTO moods (id, eventId, userId, value, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(id, eventId, userId, value, now, now);
    return id;
  },

  /**
   * Returns { dominantMood, moodBreakdown, totalVotes } for an event.
   * moodBreakdown values are percentages (0–100 integers).
   */
  getBreakdown(eventId) {
    const votes = getDb()
      .prepare('SELECT value FROM moods WHERE eventId = ?')
      .all(eventId);

    const total = votes.length;
    if (!total) {
      return { dominantMood: null, moodBreakdown: { fire: 0, mid: 0, dead: 0 }, totalVotes: 0 };
    }

    const counts = votes.reduce(
      (acc, { value }) => { acc[value] = (acc[value] || 0) + 1; return acc; },
      { fire: 0, mid: 0, dead: 0 },
    );

    const dominantMood = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];

    // Use floor + remainder assignment so the three values always sum to 100.
    const fireP = Math.round((counts.fire / total) * 100);
    const midP  = Math.round((counts.mid  / total) * 100);
    const deadP = Math.max(0, 100 - fireP - midP); // absorbs rounding error

    return {
      dominantMood,
      moodBreakdown: { fire: fireP, mid: midP, dead: deadP },
      totalVotes: total,
    };
  },

  /** Returns the number of mood votes cast in the last `minutes` minutes. */
  countRecent(eventId, minutes) {
    const since = new Date(Date.now() - minutes * 60 * 1000).toISOString();
    return getDb()
      .prepare('SELECT COUNT(*) as c FROM moods WHERE eventId = ? AND updatedAt >= ?')
      .get(eventId, since).c;
  },
};

module.exports = moodRepository;
