/**
 * moodController
 * Handles mood voting (one vote per user per event, upsert).
 */

const moodRepository  = require('../repositories/moodRepository');
const eventRepository = require('../repositories/eventRepository');

const VALID_MOODS = ['fire', 'mid', 'dead'];

async function postMood(req, res, next) {
  try {
    const { id: eventId } = req.params;
    const { userId = 'demo-user', value } = req.body;

    if (!VALID_MOODS.includes(value)) {
      return res.status(400).json({ error: `Invalid mood. Must be one of: ${VALID_MOODS.join(', ')}` });
    }

    const event = await eventRepository.findById(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    await moodRepository.upsert(eventId, userId, value);
    const breakdown = await moodRepository.getBreakdown(eventId);
    res.json({ success: true, ...breakdown });
  } catch (err) {
    next(err);
  }
}

async function getMood(req, res, next) {
  try {
    const { id: eventId } = req.params;
    const event = await eventRepository.findById(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json({ eventId, ...await moodRepository.getBreakdown(eventId) });
  } catch (err) {
    next(err);
  }
}

module.exports = { postMood, getMood };
