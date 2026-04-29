const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');

const followRepository = {
  follow(followerId, followingId) {
    const existing = getDb()
      .prepare('SELECT id FROM follows WHERE followerId = ? AND followingId = ?')
      .get(followerId, followingId);
    if (existing) return { alreadyFollowing: true };

    const id = uuidv4();
    getDb()
      .prepare('INSERT INTO follows (id, followerId, followingId, createdAt) VALUES (?, ?, ?, ?)')
      .run(id, followerId, followingId, new Date().toISOString());
    return { id, followerId, followingId };
  },

  unfollow(followerId, followingId) {
    getDb()
      .prepare('DELETE FROM follows WHERE followerId = ? AND followingId = ?')
      .run(followerId, followingId);
  },

  isFollowing(followerId, followingId) {
    return !!getDb()
      .prepare('SELECT id FROM follows WHERE followerId = ? AND followingId = ?')
      .get(followerId, followingId);
  },

  getFollowing(userId) {
    return getDb()
      .prepare('SELECT followingId as userId, createdAt FROM follows WHERE followerId = ? ORDER BY createdAt DESC')
      .all(userId);
  },

  getFollowers(userId) {
    return getDb()
      .prepare('SELECT followerId as userId, createdAt FROM follows WHERE followingId = ? ORDER BY createdAt DESC')
      .all(userId);
  },

  countFollowing(userId) {
    return getDb().prepare('SELECT COUNT(*) as c FROM follows WHERE followerId = ?').get(userId).c;
  },

  countFollowers(userId) {
    return getDb().prepare('SELECT COUNT(*) as c FROM follows WHERE followingId = ?').get(userId).c;
  },
};

module.exports = followRepository;
