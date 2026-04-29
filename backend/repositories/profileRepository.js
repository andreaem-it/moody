/**
 * profileRepository
 * PostgreSQL migration: replace getDb() with a pg client; keep same interface.
 *
 * Note: preferredVibes is stored as JSON text; this repository parses it
 * automatically so callers always receive/pass JavaScript arrays.
 */

const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');

const DEFAULTS = {
  preferredVibes:   '[]',
  maxDistanceKm:    20,
  budgetLevel:      'medium',
  energyPreference: 0.5,
  socialPreference: 0.5,
  explorationRate:  0.3,
};

function parse(row) {
  if (!row) return null;
  return {
    ...row,
    preferredVibes: JSON.parse(row.preferredVibes || '[]'),
    displayName: row.displayName ?? null,
    avatarUrl:   row.avatarUrl   ?? null,
  };
}

const profileRepository = {
  getByUser(userId) {
    return parse(getDb().prepare('SELECT * FROM user_profiles WHERE userId = ?').get(userId));
  },

  /**
   * Returns existing profile or creates a default one.
   * Always returns a parsed profile (preferredVibes as array).
   */
  createIfNotExists(userId) {
    const existing = this.getByUser(userId);
    if (existing) return existing;

    const id = uuidv4();
    const now = new Date().toISOString();
    getDb()
      .prepare(`
        INSERT INTO user_profiles
          (id, userId, preferredVibes, maxDistanceKm, budgetLevel,
           energyPreference, socialPreference, explorationRate, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        id, userId,
        DEFAULTS.preferredVibes, DEFAULTS.maxDistanceKm, DEFAULTS.budgetLevel,
        DEFAULTS.energyPreference, DEFAULTS.socialPreference, DEFAULTS.explorationRate,
        now, now,
      );

    return this.getByUser(userId);
  },

  /**
   * Full profile update (adaptive fields). Pass any subset of profile fields.
   * `preferredVibes` must be a JavaScript array — it is serialised here.
   */
  update(userId, { preferredVibes, maxDistanceKm, budgetLevel, energyPreference, socialPreference, explorationRate }) {
    const now = new Date().toISOString();
    getDb()
      .prepare(`
        UPDATE user_profiles
        SET preferredVibes = ?, maxDistanceKm = ?, budgetLevel = ?,
            energyPreference = ?, socialPreference = ?, explorationRate = ?, updatedAt = ?
        WHERE userId = ?
      `)
      .run(
        JSON.stringify(preferredVibes ?? []),
        maxDistanceKm, budgetLevel,
        energyPreference, socialPreference,
        explorationRate ?? DEFAULTS.explorationRate,
        now, userId,
      );

    return this.getByUser(userId);
  },

  /**
   * Update display name and/or avatar URL only.
   * Pass only the fields you want to change (both are optional).
   */
  updateMeta(userId, { displayName, avatarUrl } = {}) {
    const now = new Date().toISOString();
    const db  = getDb();

    if (displayName !== undefined) {
      db.prepare('UPDATE user_profiles SET displayName = ?, updatedAt = ? WHERE userId = ?')
        .run(displayName === '' ? null : displayName.trim().slice(0, 50), now, userId);
    }
    if (avatarUrl !== undefined) {
      db.prepare('UPDATE user_profiles SET avatarUrl = ?, updatedAt = ? WHERE userId = ?')
        .run(avatarUrl, now, userId);
    }

    return this.getByUser(userId);
  },
};

module.exports = profileRepository;
