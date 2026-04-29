/**
 * checkinRepository — Firestore implementation.
 *
 * Document structure (collection: 'checkins'):
 *   id, eventId, userId, createdAt
 */

const { v4: uuidv4 } = require('uuid');
const { getDb }      = require('../db/database');

const COL = 'checkins';

const checkinRepository = {
  async create(eventId, userId) {
    const id  = uuidv4();
    const now = new Date().toISOString();
    await getDb().collection(COL).doc(id).set({ id, eventId, userId, createdAt: now });
    return { id, eventId, userId, createdAt: now };
  },

  async existsByEventAndUser(eventId, userId) {
    const snap = await getDb()
      .collection(COL)
      .where('eventId', '==', eventId)
      .where('userId',  '==', userId)
      .limit(1)
      .get();
    return !snap.empty;
  },

  async countByEvent(eventId) {
    const snap = await getDb()
      .collection(COL)
      .where('eventId', '==', eventId)
      .get();
    return snap.size;
  },

  async countRecent(eventId, minutes) {
    const since = new Date(Date.now() - minutes * 60 * 1000).toISOString();
    const snap  = await getDb()
      .collection(COL)
      .where('eventId',   '==', eventId)
      .where('createdAt', '>=', since)
      .get();
    return snap.size;
  },
};

module.exports = checkinRepository;
