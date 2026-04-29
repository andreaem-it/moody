/**
 * profileService
 *
 * Encapsulates the business rules for updating a user profile based on
 * event interactions. All persistence is delegated to repositories.
 *
 * No `db` parameter anywhere — services are decoupled from storage.
 */

const profileRepository = require('../repositories/profileRepository');
const feedbackRepository = require('../repositories/feedbackRepository');

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Updates the user profile based on a feedback action.
 *
 * Signal strengths:
 *   like          → strong positive (+10% energy/social, add vibes)
 *   check-in      → very strong positive (+15%, add vibes)  [see updateProfileFromCheckin]
 *   wrong_vibe    → strong negative (remove vibes, −8% energy/social)
 *   not_for_me    → moderate negative (remove vibes)
 *   too_far       → spatial negative (−12% maxDistanceKm)
 *   too_expensive → budget downgrade
 *   skip          → weak; but 3 skips on same vibe → remove it
 */
function updateProfileFromFeedback(userId, feedbackType, event) {
  const profile = profileRepository.createIfNotExists(userId);

  // event.vibes is always an array at this point (parsed by repository or controller)
  const eventVibes = Array.isArray(event.vibes) ? event.vibes : JSON.parse(event.vibes || '[]');
  const preferredVibes = new Set(profile.preferredVibes);

  let { maxDistanceKm, budgetLevel, energyPreference, socialPreference, explorationRate } = profile;

  switch (feedbackType) {
    case 'like':
      eventVibes.forEach((v) => preferredVibes.add(v));
      energyPreference = clamp(energyPreference + (event.energyScore || 0) * 0.10);
      socialPreference = clamp(socialPreference + (event.socialScore  || 0) * 0.10);
      break;

    case 'not_for_me':
      eventVibes.forEach((v) => preferredVibes.delete(v));
      break;

    case 'wrong_vibe':
      eventVibes.forEach((v) => preferredVibes.delete(v));
      energyPreference = clamp(energyPreference - (event.energyScore || 0) * 0.08);
      socialPreference = clamp(socialPreference - (event.socialScore  || 0) * 0.08);
      break;

    case 'too_far':
      maxDistanceKm = Math.max(maxDistanceKm * 0.88, 2);
      break;

    case 'too_expensive':
      budgetLevel = decreaseBudget(budgetLevel);
      break;

    case 'skip':
      applySkipPattern(userId, eventVibes, preferredVibes);
      break;

    default:
      break;
  }

  profileRepository.update(userId, {
    preferredVibes: [...preferredVibes],
    maxDistanceKm,
    budgetLevel,
    energyPreference,
    socialPreference,
    explorationRate,
  });
}

/**
 * Very strong positive signal when a user checks in.
 */
function updateProfileFromCheckin(userId, event) {
  const profile = profileRepository.createIfNotExists(userId);
  const eventVibes = Array.isArray(event.vibes) ? event.vibes : JSON.parse(event.vibes || '[]');
  const preferredVibes = new Set(profile.preferredVibes);

  eventVibes.forEach((v) => preferredVibes.add(v));

  profileRepository.update(userId, {
    preferredVibes: [...preferredVibes],
    maxDistanceKm:    profile.maxDistanceKm,
    budgetLevel:      profile.budgetLevel,
    energyPreference: clamp(profile.energyPreference + (event.energyScore || 0) * 0.15),
    socialPreference: clamp(profile.socialPreference + (event.socialScore  || 0) * 0.15),
    explorationRate:  profile.explorationRate,
  });
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * After 3 skips on events containing a given vibe, remove that vibe from the profile.
 * The current skip must already be persisted before this is called.
 */
function applySkipPattern(userId, eventVibes, preferredVibes) {
  for (const vibe of eventVibes) {
    const skipCount = feedbackRepository.countSkipsForVibe(userId, vibe);
    if (skipCount >= 3) {
      preferredVibes.delete(vibe);
    }
  }
}

function clamp(val, min = 0, max = 1) {
  return Math.min(Math.max(val, min), max);
}

function decreaseBudget(level) {
  const levels = ['low', 'medium', 'high'];
  const idx = levels.indexOf(level);
  return idx > 0 ? levels[idx - 1] : 'low';
}

module.exports = { updateProfileFromFeedback, updateProfileFromCheckin };
