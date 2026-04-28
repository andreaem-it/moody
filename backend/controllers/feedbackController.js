const { v4: uuidv4 } = require('uuid');
const { updateProfileFromFeedback } = require('../services/profileService');

const VALID_TYPES = ['like', 'skip', 'not_for_me', 'too_far', 'too_expensive', 'wrong_vibe'];

async function postFeedback(req, res, next) {
  try {
    const { id: eventId } = req.params;
    const { userId = 'demo-user', type } = req.body;

    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: `Invalid feedback type. Must be one of: ${VALID_TYPES.join(', ')}` });
    }

    const event = req.db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const now = new Date().toISOString();
    req.db.prepare(`
      INSERT INTO feedback (id, eventId, userId, type, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuidv4(), eventId, userId, type, now);

    // Update adaptive profile
    const eventWithVibes = { ...event, vibes: JSON.parse(event.vibes || '[]') };
    updateProfileFromFeedback(req.db, userId, type, eventWithVibes);

    res.json({ success: true, type, userId, eventId });
  } catch (err) {
    next(err);
  }
}

module.exports = { postFeedback };
