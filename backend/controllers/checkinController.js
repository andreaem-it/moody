const { v4: uuidv4 } = require('uuid');
const { updateProfileFromCheckin } = require('../services/profileService');

async function postCheckin(req, res, next) {
  try {
    const { id: eventId } = req.params;
    const { userId = 'demo-user' } = req.body;

    const event = req.db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    // Prevent duplicate active check-in for same user + event
    const existing = req.db.prepare('SELECT id FROM checkins WHERE eventId = ? AND userId = ?').get(eventId, userId);
    if (existing) {
      return res.status(409).json({ error: 'Already checked in to this event', alreadyCheckedIn: true });
    }

    const now = new Date().toISOString();
    req.db.prepare('INSERT INTO checkins (id, eventId, userId, createdAt) VALUES (?, ?, ?, ?)').run(
      uuidv4(), eventId, userId, now,
    );

    // Strong positive profile signal
    const eventWithVibes = { ...event, vibes: JSON.parse(event.vibes || '[]') };
    updateProfileFromCheckin(req.db, userId, eventWithVibes);

    const peopleCount = req.db.prepare('SELECT COUNT(*) as c FROM checkins WHERE eventId = ?').get(eventId).c;

    res.status(201).json({ success: true, peopleCount, userId, eventId });
  } catch (err) {
    next(err);
  }
}

async function getCheckins(req, res, next) {
  try {
    const { id: eventId } = req.params;
    const event = req.db.prepare('SELECT id FROM events WHERE id = ?').get(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const peopleCount = req.db.prepare('SELECT COUNT(*) as c FROM checkins WHERE eventId = ?').get(eventId).c;
    res.json({ eventId, peopleCount });
  } catch (err) {
    next(err);
  }
}

module.exports = { postCheckin, getCheckins };
