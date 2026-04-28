const { v4: uuidv4 } = require('uuid');

const DEFAULT_PROFILE = {
  preferredVibes: '[]',
  maxDistanceKm: 20,
  budgetLevel: 'medium',
  energyPreference: 0.5,
  socialPreference: 0.5,
  explorationRate: 0.3,
};

/**
 * Returns the user profile, creating a default one if it does not exist.
 */
function getOrCreateProfile(db, userId) {
  let profile = db.prepare('SELECT * FROM user_profiles WHERE userId = ?').get(userId);

  if (!profile) {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO user_profiles (id, userId, preferredVibes, maxDistanceKm, budgetLevel, energyPreference, socialPreference, explorationRate, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(), userId,
      DEFAULT_PROFILE.preferredVibes,
      DEFAULT_PROFILE.maxDistanceKm,
      DEFAULT_PROFILE.budgetLevel,
      DEFAULT_PROFILE.energyPreference,
      DEFAULT_PROFILE.socialPreference,
      DEFAULT_PROFILE.explorationRate,
      now, now,
    );
    profile = db.prepare('SELECT * FROM user_profiles WHERE userId = ?').get(userId);
  }

  return profile;
}

/**
 * Updates the user profile based on a feedback action.
 * All updates are additive / nudge-based — never hard resets.
 */
function updateProfileFromFeedback(db, userId, feedbackType, event) {
  const profile = getOrCreateProfile(db, userId);
  const eventVibes = Array.isArray(event.vibes) ? event.vibes : JSON.parse(event.vibes || '[]');
  const preferredVibes = new Set(JSON.parse(profile.preferredVibes || '[]'));

  let { maxDistanceKm, budgetLevel, energyPreference, socialPreference } = profile;

  switch (feedbackType) {
    case 'like':
      eventVibes.forEach((v) => preferredVibes.add(v));
      energyPreference = clamp(energyPreference + event.energyScore * 0.05);
      socialPreference = clamp(socialPreference + event.socialScore * 0.05);
      break;

    case 'not_for_me':
      eventVibes.forEach((v) => preferredVibes.delete(v));
      break;

    case 'wrong_vibe':
      eventVibes.forEach((v) => preferredVibes.delete(v));
      break;

    case 'too_far':
      maxDistanceKm = Math.max(maxDistanceKm * 0.88, 2);
      break;

    case 'too_expensive':
      budgetLevel = decreaseBudget(budgetLevel);
      break;

    case 'skip':
      // Weak signal — only minor exploration bump
      break;

    default:
      break;
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE user_profiles
    SET preferredVibes = ?, maxDistanceKm = ?, budgetLevel = ?, energyPreference = ?, socialPreference = ?, updatedAt = ?
    WHERE userId = ?
  `).run(
    JSON.stringify([...preferredVibes]),
    maxDistanceKm,
    budgetLevel,
    energyPreference,
    socialPreference,
    now,
    userId,
  );
}

/**
 * Strengthens profile signals from a check-in (strong positive).
 */
function updateProfileFromCheckin(db, userId, event) {
  const profile = getOrCreateProfile(db, userId);
  const eventVibes = Array.isArray(event.vibes) ? event.vibes : JSON.parse(event.vibes || '[]');
  const preferredVibes = new Set(JSON.parse(profile.preferredVibes || '[]'));

  eventVibes.forEach((v) => preferredVibes.add(v));

  const energyPreference = clamp(profile.energyPreference + event.energyScore * 0.1);
  const socialPreference = clamp(profile.socialPreference + event.socialScore * 0.1);

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE user_profiles
    SET preferredVibes = ?, energyPreference = ?, socialPreference = ?, updatedAt = ?
    WHERE userId = ?
  `).run(JSON.stringify([...preferredVibes]), energyPreference, socialPreference, now, userId);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function clamp(val, min = 0, max = 1) {
  return Math.min(Math.max(val, min), max);
}

function decreaseBudget(level) {
  const levels = ['low', 'medium', 'high'];
  const idx = levels.indexOf(level);
  return idx > 0 ? levels[idx - 1] : 'low';
}

module.exports = { getOrCreateProfile, updateProfileFromFeedback, updateProfileFromCheckin };
