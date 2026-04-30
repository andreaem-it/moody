/**
 * profileController
 * Exposes the adaptive user profile for inspection and meta updates.
 * Avatar uploads are stored in Firebase Storage.
 */

const profileRepository  = require('../repositories/profileRepository');
const { uploadBuffer, avatarPath } = require('../services/storageService');

async function getProfile(req, res, next) {
  try {
    const { userId } = req.params;
    const profile = await profileRepository.createIfNotExists(userId);
    res.json(profile);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /profile/:userId
 * Accepts multipart/form-data with optional fields:
 *   - displayName (text)
 *   - avatar      (file — handled by multer memory storage in the route)
 */
async function updateProfile(req, res, next) {
  try {
    const { userId } = req.params;

    await profileRepository.createIfNotExists(userId);

    const updates = {};

    if (req.body.displayName !== undefined) {
      updates.displayName = req.body.displayName;
    }

    if (req.file) {
      const storagePath    = avatarPath(userId, req.file.mimetype);
      updates.avatarUrl    = await uploadBuffer(req.file.buffer, req.file.mimetype, storagePath);
    }

    const profile = await profileRepository.updateMeta(userId, updates);
    res.json(profile);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /profile/:userId/preferences
 * Accepts JSON: { preferredVibes, maxDistanceKm, budgetLevel,
 *                 energyPreference, socialPreference, explorationRate }
 */
async function updatePreferences(req, res, next) {
  try {
    const { userId } = req.params;
    await profileRepository.createIfNotExists(userId);

    const {
      preferredVibes, maxDistanceKm, budgetLevel,
      energyPreference, socialPreference, explorationRate,
    } = req.body;

    const profile = await profileRepository.update(userId, {
      preferredVibes:   Array.isArray(preferredVibes) ? preferredVibes : undefined,
      maxDistanceKm:    maxDistanceKm    != null ? Number(maxDistanceKm)    : undefined,
      budgetLevel:      budgetLevel      != null ? budgetLevel              : undefined,
      energyPreference: energyPreference != null ? Number(energyPreference) : undefined,
      socialPreference: socialPreference != null ? Number(socialPreference) : undefined,
      explorationRate:  explorationRate  != null ? Number(explorationRate)  : undefined,
    });

    res.json(profile);
  } catch (err) {
    next(err);
  }
}

module.exports = { getProfile, updateProfile, updatePreferences };
