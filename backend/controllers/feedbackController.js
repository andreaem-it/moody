/**
 * feedbackController
 * Saves user feedback and triggers profile updates.
 * All DB access is delegated to repositories.
 */

const { updateProfileFromFeedback } = require('../services/profileService');
const feedbackRepository = require('../repositories/feedbackRepository');
const eventRepository = require('../repositories/eventRepository');
const feedCache = require('../services/feedCache');

const VALID_TYPES = ['like', 'skip', 'not_for_me', 'too_far', 'too_expensive', 'wrong_vibe'];

async function postFeedback(req, res, next) {
  try {
    const { id: eventId } = req.params;
    const { userId = 'demo-user', type } = req.body;

    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: `Invalid feedback type. Must be one of: ${VALID_TYPES.join(', ')}` });
    }

    const event = eventRepository.findById(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    // Persist feedback first (skip pattern check reads from DB)
    feedbackRepository.create(eventId, userId, type);

    // Update adaptive profile — event.vibes is already a parsed array
    updateProfileFromFeedback(userId, type, event);

    // Invalidate feed cache so next request reflects updated preferences
    feedCache.invalidate(userId);

    res.json({ success: true, type, userId, eventId });
  } catch (err) {
    next(err);
  }
}

module.exports = { postFeedback };
