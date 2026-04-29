/**
 * postRepository — Firestore implementation.
 *
 * Author and event metadata are denormalized at write time so that
 * getFeedForUser and getByUser don't require N+1 queries.
 *
 * Document structure (collection: 'posts'):
 *   id, userId, eventId, mediaUrl, mediaType, caption, createdAt,
 *   eventTitle, eventLocation, eventDate,
 *   authorDisplayName, authorAvatarUrl
 */

const { v4: uuidv4 } = require('uuid');
const { getDb }      = require('../db/database');

const COL = 'posts';

function _parse(snap) {
  if (!snap || !snap.exists) return null;
  return { ...snap.data(), id: snap.id };
}

const postRepository = {
  async create({ userId, eventId = null, mediaUrl = null, mediaType = 'photo', caption = '',
                 eventTitle = null, eventLocation = null, eventDate = null,
                 authorDisplayName = null, authorAvatarUrl = null }) {
    const id  = uuidv4();
    const now = new Date().toISOString();

    const data = {
      id, userId,
      eventId:          eventId          ?? null,
      mediaUrl:         mediaUrl         ?? null,
      mediaType,
      caption,
      createdAt:        now,
      eventTitle:       eventTitle       ?? null,
      eventLocation:    eventLocation    ?? null,
      eventDate:        eventDate        ?? null,
      authorDisplayName: authorDisplayName ?? null,
      authorAvatarUrl:  authorAvatarUrl  ?? null,
    };

    await getDb().collection(COL).doc(id).set(data);
    return data;
  },

  async findById(id) {
    const snap = await getDb().collection(COL).doc(id).get();
    return _parse(snap);
  },

  /**
   * Returns posts from users that `userId` follows + own posts (newest first).
   * Firestore `whereIn` supports up to 30 values; for social graphs > 30,
   * cursor-based pagination with multiple queries is recommended.
   */
  async getFeedForUser(userId, limit = 50) {
    const db = getDb();

    // Fetch the IDs of users this user follows
    const followsSnap = await db
      .collection('follows')
      .where('followerId', '==', userId)
      .get();

    const followingIds = followsSnap.docs.map((d) => d.data().followingId);
    const authorIds    = [...new Set([userId, ...followingIds])].slice(0, 30);

    const snap = await db
      .collection(COL)
      .where('userId', 'in', authorIds)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snap.docs.map((d) => ({ ...d.data(), id: d.id }));
  },

  async getByUser(userId) {
    const snap = await getDb()
      .collection(COL)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map((d) => ({ ...d.data(), id: d.id }));
  },

  async delete(id, userId) {
    const ref  = getDb().collection(COL).doc(id);
    const snap = await ref.get();
    if (snap.exists && snap.data().userId === userId) {
      await ref.delete();
    }
  },
};

module.exports = postRepository;
