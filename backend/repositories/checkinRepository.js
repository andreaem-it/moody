/**
 * checkinRepository
 * PostgreSQL migration: replace getDb() with a pg client; keep same interface.
 */

const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');

const checkinRepository = {
  create(eventId, userId) {
    const id = uuidv4();
    const now = new Date().toISOString();
    getDb()
      .prepare('INSERT INTO checkins (id, eventId, userId, createdAt) VALUES (?, ?, ?, ?)')
      .run(id, eventId, userId, now);
    return { id, eventId, userId, createdAt: now };
  },

  existsByEventAndUser(eventId, userId) {
    const row = getDb()
      .prepare('SELECT id FROM checkins WHERE eventId = ? AND userId = ?')
      .get(eventId, userId);
    return !!row;
  },

  countByEvent(eventId) {
    return getDb()
      .prepare('SELECT COUNT(*) as c FROM checkins WHERE eventId = ?')
      .get(eventId).c;
  },

  /**
   * Returns the number of checkins in the last `minutes` minutes.
   * Used for trending score and LiveLayer momentum.
   */
  countRecent(eventId, minutes) {
    const since = new Date(Date.now() - minutes * 60 * 1000).toISOString();
    return getDb()
      .prepare('SELECT COUNT(*) as c FROM checkins WHERE eventId = ? AND createdAt >= ?')
      .get(eventId, since).c;
  },
};

module.exports = checkinRepository;
