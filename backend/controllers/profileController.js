/**
 * profileController
 * Exposes the adaptive user profile for inspection and update.
 */

const profileRepository = require('../repositories/profileRepository');

async function getProfile(req, res, next) {
  try {
    const { userId } = req.params;
    const profile = profileRepository.createIfNotExists(userId);
    res.json(profile);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /profile/:userId
 * Accepts multipart/form-data with optional fields:
 *   - displayName (text)
 *   - avatar      (file — handled by multer in the route)
 */
async function updateProfile(req, res, next) {
  try {
    const { userId } = req.params;

    // Ensure the profile row exists before updating
    profileRepository.createIfNotExists(userId);

    const updates = {};

    if (req.body.displayName !== undefined) {
      updates.displayName = req.body.displayName;
    }

    if (req.file) {
      updates.avatarUrl = `/uploads/${req.file.filename}`;
    }

    const profile = profileRepository.updateMeta(userId, updates);
    res.json(profile);
  } catch (err) {
    next(err);
  }
}

module.exports = { getProfile, updateProfile };
