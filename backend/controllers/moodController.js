/**
 * moodController
 * Handles mood voting (one vote per user per event, upsert).
 * All DB access is delegated to repositories.
 */

const moodRepository = require('../repositories/moodRepository');
const eventRepository = require('../repositories/eventRepository');

const VALID_MOODS = ['fire', 'mid', 'dead'];

async function postMood(req, res, next) {
  try {
    const { id: eventId } = req.params;
    const { userId = 'demo-user', value } = req.body;

    if (!VALID_MOODS.includes(value)) {
      return res.status(400).json({ error: `Invalid mood. Must be one of: ${VALID_MOODS.join(', ')}` });
    }

    const event = eventRepository.findById(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    moodRepository.upsert(eventId, userId, value);

    const breakdown = moodRepository.getBreakdown(eventId);
    res.json({ success: true, ...breakdown });
  } catch (err) {
    next(err);
  }
}

async function getMood(req, res, next) {
  try {
    const { id: eventId } = req.params;

    const event = eventRepository.findById(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    res.json({ eventId, ...moodRepository.getBreakdown(eventId) });
  } catch (err) {
    next(err);
  }
}

module.exports = { postMood, getMood };
