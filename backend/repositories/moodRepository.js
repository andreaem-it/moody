/**
 * moodRepository — Firestore implementation.
 *
 * Document ID: `${eventId}_${userId}` — enables O(1) upsert without a query.
 *
 * Document structure (collection: 'moods'):
 *   eventId, userId, value ('fire'|'mid'|'dead'), createdAt, updatedAt
 */

const { getDb } = require('../db/database');

const COL = 'moods';

const moodRepository = {
  /**
   * Inserts or updates a mood vote (one per user per event).
   */
  async upsert(eventId, userId, value) {
    const docId = `${eventId}_${userId}`;
    const ref   = getDb().collection(COL).doc(docId);
    const now   = new Date().toISOString();

    const snap = await ref.get();
    if (snap.exists) {
      await ref.update({ value, updatedAt: now });
    } else {
      await ref.set({ eventId, userId, value, createdAt: now, updatedAt: now });
    }
    return docId;
  },

  /**
   * Returns { dominantMood, moodBreakdown, totalVotes } for an event.
   */
  async getBreakdown(eventId) {
    const snap = await getDb()
      .collection(COL)
      .where('eventId', '==', eventId)
      .get();

    const total = snap.size;
    if (!total) {
      return { dominantMood: null, moodBreakdown: { fire: 0, mid: 0, dead: 0 }, totalVotes: 0 };
    }

    const counts = snap.docs.reduce(
      (acc, doc) => {
        const v = doc.data().value;
        acc[v] = (acc[v] || 0) + 1;
        return acc;
      },
      { fire: 0, mid: 0, dead: 0 },
    );

    const dominantMood = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    const fireP = Math.round((counts.fire / total) * 100);
    const midP  = Math.round((counts.mid  / total) * 100);
    const deadP = Math.max(0, 100 - fireP - midP);

    return {
      dominantMood,
      moodBreakdown: { fire: fireP, mid: midP, dead: deadP },
      totalVotes: total,
    };
  },

  /** Number of mood votes updated in the last `minutes` minutes. */
  async countRecent(eventId, minutes) {
    const since = new Date(Date.now() - minutes * 60 * 1000).toISOString();
    const snap  = await getDb()
      .collection(COL)
      .where('eventId', '==', eventId)
      .where('updatedAt', '>=', since)
      .get();
    return snap.size;
  },
};

module.exports = moodRepository;
