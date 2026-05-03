/**
 * feedbackRepository — Firestore implementation.
 *
 * `vibes` is denormalized from the event at creation time so that
 * countSkipsForVibe can use Firestore's `array-contains` without a JOIN.
 *
 * Document structure (collection: 'feedback'):
 *   id, eventId, userId, type, vibes (array), createdAt
 */

const { v4: uuidv4 } = require('uuid');
const { getDb }      = require('../db/database');

const COL = 'feedback';

const feedbackRepository = {
  /**
   * @param {string}   eventId
   * @param {string}   userId
   * @param {string}   type
   * @param {string[]} vibes  - Event's vibes array, denormalized for efficient skip queries.
   */
  async create(eventId, userId, type, vibes = []) {
    const id  = uuidv4();
    const now = new Date().toISOString();
    await getDb().collection(COL).doc(id).set({ id, eventId, userId, type, vibes, createdAt: now });
    return { id, eventId, userId, type, vibes, createdAt: now };
  },

  /** Conta feedback di un tipo specifico per un evento. Usato nelle stats organizer. */
  async countByEventAndType(eventId, type) {
    const snap = await getDb()
      .collection(COL)
      .where('eventId', '==', eventId)
      .where('type',    '==', type)
      .get();
    return snap.size;
  },

  /**
   * Counts how many times `userId` has skipped events containing `vibe`.
   * Relies on the denormalized `vibes` array field.
   */
  async countSkipsForVibe(userId, vibe) {
    const snap = await getDb()
      .collection(COL)
      .where('userId', '==', userId)
      .where('type',   '==', 'skip')
      .where('vibes',  'array-contains', vibe)
      .get();
    return snap.size;
  },
};

module.exports = feedbackRepository;
