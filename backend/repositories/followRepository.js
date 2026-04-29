/**
 * followRepository — Firestore implementation.
 *
 * Document ID: `${followerId}_${followingId}` — O(1) follow/unfollow/check.
 *
 * Document structure (collection: 'follows'):
 *   followerId, followingId, createdAt
 */

const { getDb } = require('../db/database');

const COL = 'follows';

const followRepository = {
  async follow(followerId, followingId) {
    const docId = `${followerId}_${followingId}`;
    const ref   = getDb().collection(COL).doc(docId);
    const snap  = await ref.get();

    if (snap.exists) return { alreadyFollowing: true };

    const now = new Date().toISOString();
    await ref.set({ followerId, followingId, createdAt: now });
    return { id: docId, followerId, followingId };
  },

  async unfollow(followerId, followingId) {
    await getDb().collection(COL).doc(`${followerId}_${followingId}`).delete();
  },

  async isFollowing(followerId, followingId) {
    const snap = await getDb().collection(COL).doc(`${followerId}_${followingId}`).get();
    return snap.exists;
  },

  async getFollowing(userId) {
    const snap = await getDb()
      .collection(COL)
      .where('followerId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map((d) => ({ userId: d.data().followingId, createdAt: d.data().createdAt }));
  },

  async getFollowers(userId) {
    const snap = await getDb()
      .collection(COL)
      .where('followingId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map((d) => ({ userId: d.data().followerId, createdAt: d.data().createdAt }));
  },

  async countFollowing(userId) {
    const snap = await getDb().collection(COL).where('followerId', '==', userId).get();
    return snap.size;
  },

  async countFollowers(userId) {
    const snap = await getDb().collection(COL).where('followingId', '==', userId).get();
    return snap.size;
  },
};

module.exports = followRepository;
