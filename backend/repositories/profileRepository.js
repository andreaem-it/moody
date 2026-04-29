/**
 * profileRepository — Firestore implementation.
 *
 * Document ID: userId (collection: 'users').
 * preferredVibes is stored as a native Firestore array — no JSON serialisation needed.
 */

const { getDb } = require('../db/database');

const COL = 'users';

const DEFAULTS = {
  preferredVibes:   [],
  maxDistanceKm:    20,
  budgetLevel:      'medium',
  energyPreference: 0.5,
  socialPreference: 0.5,
  explorationRate:  0.3,
};

function _parse(snap) {
  if (!snap || !snap.exists) return null;
  const data = snap.data();
  return {
    ...data,
    preferredVibes: Array.isArray(data.preferredVibes) ? data.preferredVibes : [],
    displayName:    data.displayName ?? null,
    avatarUrl:      data.avatarUrl   ?? null,
  };
}

const profileRepository = {
  async getByUser(userId) {
    const snap = await getDb().collection(COL).doc(userId).get();
    return _parse(snap);
  },

  async createIfNotExists(userId) {
    const ref  = getDb().collection(COL).doc(userId);
    const snap = await ref.get();
    if (snap.exists) return _parse(snap);

    const now  = new Date().toISOString();
    const data = {
      userId,
      ...DEFAULTS,
      displayName: null,
      avatarUrl:   null,
      createdAt:   now,
      updatedAt:   now,
    };
    // merge: true prevents overwriting a doc created concurrently
    await ref.set(data, { merge: true });
    return data;
  },

  async update(userId, { preferredVibes, maxDistanceKm, budgetLevel, energyPreference, socialPreference, explorationRate }) {
    const now = new Date().toISOString();
    await getDb().collection(COL).doc(userId).update({
      preferredVibes:   preferredVibes   ?? [],
      maxDistanceKm,
      budgetLevel,
      energyPreference,
      socialPreference,
      explorationRate:  explorationRate  ?? DEFAULTS.explorationRate,
      updatedAt: now,
    });
    return this.getByUser(userId);
  },

  async updateMeta(userId, { displayName, avatarUrl } = {}) {
    const now     = new Date().toISOString();
    const updates = { updatedAt: now };

    if (displayName !== undefined) {
      updates.displayName = displayName === '' ? null : String(displayName).trim().slice(0, 50);
    }
    if (avatarUrl !== undefined) {
      updates.avatarUrl = avatarUrl;
    }

    await getDb().collection(COL).doc(userId).update(updates);
    return this.getByUser(userId);
  },
};

module.exports = profileRepository;
