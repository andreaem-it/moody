/**
 * profileService
 *
 * All repository calls are async — callers must await this service's functions.
 */

const profileRepository  = require('../repositories/profileRepository');
const feedbackRepository = require('../repositories/feedbackRepository');

async function updateProfileFromFeedback(userId, feedbackType, event) {
  const profile   = await profileRepository.createIfNotExists(userId);
  const eventVibes = Array.isArray(event.vibes) ? event.vibes : [];
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
      await applySkipPattern(userId, eventVibes, preferredVibes);
      break;

    default:
      break;
  }

  await profileRepository.update(userId, {
    preferredVibes: [...preferredVibes],
    maxDistanceKm,
    budgetLevel,
    energyPreference,
    socialPreference,
    explorationRate,
  });
}

async function updateProfileFromCheckin(userId, event) {
  const profile    = await profileRepository.createIfNotExists(userId);
  const eventVibes = Array.isArray(event.vibes) ? event.vibes : [];
  const preferredVibes = new Set(profile.preferredVibes);

  eventVibes.forEach((v) => preferredVibes.add(v));

  await profileRepository.update(userId, {
    preferredVibes:   [...preferredVibes],
    maxDistanceKm:    profile.maxDistanceKm,
    budgetLevel:      profile.budgetLevel,
    energyPreference: clamp(profile.energyPreference + (event.energyScore || 0) * 0.15),
    socialPreference: clamp(profile.socialPreference + (event.socialScore  || 0) * 0.15),
    explorationRate:  profile.explorationRate,
  });
}

async function applySkipPattern(userId, eventVibes, preferredVibes) {
  for (const vibe of eventVibes) {
    const skipCount = await feedbackRepository.countSkipsForVibe(userId, vibe);
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
  const idx    = levels.indexOf(level);
  return idx > 0 ? levels[idx - 1] : 'low';
}

module.exports = { updateProfileFromFeedback, updateProfileFromCheckin };
