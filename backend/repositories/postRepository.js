const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');

function parse(row) {
  if (!row) return null;
  return row;
}

const postRepository = {
  create({ userId, eventId = null, mediaUrl = null, mediaType = 'photo', caption = '' }) {
    const id = uuidv4();
    const now = new Date().toISOString();
    getDb()
      .prepare(`
        INSERT INTO posts (id, userId, eventId, mediaUrl, mediaType, caption, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .run(id, userId, eventId, mediaUrl, mediaType, caption, now);
    return this.findById(id);
  },

  findById(id) {
    return parse(getDb().prepare('SELECT * FROM posts WHERE id = ?').get(id));
  },

  /** All posts from users that `userId` follows + own posts, newest first. */
  getFeedForUser(userId, limit = 50) {
    return getDb()
      .prepare(`
        SELECT p.*,
               e.title    AS eventTitle,
               e.location AS eventLocation,
               e.date     AS eventDate,
               up.displayName AS authorDisplayName,
               up.avatarUrl   AS authorAvatarUrl
        FROM posts p
        LEFT JOIN events        e  ON p.eventId = e.id
        LEFT JOIN user_profiles up ON p.userId  = up.userId
        WHERE p.userId IN (SELECT followingId FROM follows WHERE followerId = ?)
           OR p.userId = ?
        ORDER BY p.createdAt DESC
        LIMIT ?
      `)
      .all(userId, userId, limit);
  },

  /** Posts by a specific user, newest first. */
  getByUser(userId) {
    return getDb()
      .prepare(`
        SELECT p.*,
               e.title    AS eventTitle,
               e.location AS eventLocation,
               e.date     AS eventDate,
               up.displayName AS authorDisplayName,
               up.avatarUrl   AS authorAvatarUrl
        FROM posts p
        LEFT JOIN events        e  ON p.eventId = e.id
        LEFT JOIN user_profiles up ON p.userId  = up.userId
        WHERE p.userId = ?
        ORDER BY p.createdAt DESC
      `)
      .all(userId);
  },

  delete(id, userId) {
    getDb().prepare('DELETE FROM posts WHERE id = ? AND userId = ?').run(id, userId);
  },
};

module.exports = postRepository;
