const { v4: uuidv4 } = require('uuid');
const { enrichEvent } = require('../services/enrichmentService');

function getMoodBreakdown(db, eventId) {
  const votes = db.prepare('SELECT value FROM moods WHERE eventId = ?').all(eventId);
  const total = votes.length;
  if (!total) return { dominantMood: null, moodBreakdown: { fire: 0, mid: 0, dead: 0 }, totalVotes: 0 };

  const counts = votes.reduce((acc, v) => {
    acc[v.value] = (acc[v.value] || 0) + 1;
    return acc;
  }, {});

  const dominantMood = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];

  return {
    dominantMood,
    moodBreakdown: {
      fire: Math.round(((counts.fire || 0) / total) * 100),
      mid: Math.round(((counts.mid || 0) / total) * 100),
      dead: Math.round(((counts.dead || 0) / total) * 100),
    },
    totalVotes: total,
  };
}

async function listEvents(req, res, next) {
  try {
    const events = req.db.prepare('SELECT * FROM events ORDER BY date, time').all();
    const result = events.map((e) => ({
      ...e,
      vibes: JSON.parse(e.vibes || '[]'),
      peopleCount: req.db.prepare('SELECT COUNT(*) as c FROM checkins WHERE eventId = ?').get(e.id).c,
      ...getMoodBreakdown(req.db, e.id),
    }));
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getEvent(req, res, next) {
  try {
    const event = req.db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const peopleCount = req.db.prepare('SELECT COUNT(*) as c FROM checkins WHERE eventId = ?').get(event.id).c;

    res.json({
      ...event,
      vibes: JSON.parse(event.vibes || '[]'),
      peopleCount,
      ...getMoodBreakdown(req.db, event.id),
    });
  } catch (err) {
    next(err);
  }
}

async function createEvent(req, res, next) {
  try {
    const {
      title, description, date, time, location,
      latitude, longitude, price, vibes = [],
      energyScore, socialScore, sourceType = 'manual', rawText,
    } = req.body;

    if (!title || !date || !time || !location) {
      return res.status(400).json({ error: 'title, date, time and location are required' });
    }

    const enriched = enrichEvent({ title, description: description || '', rawText: rawText || '' });

    const id = uuidv4();
    const now = new Date().toISOString();
    const finalVibes = vibes.length ? vibes : enriched.vibes;

    req.db.prepare(`
      INSERT INTO events (id, title, description, date, time, location, latitude, longitude, price, vibes, energyScore, socialScore, sourceType, rawText, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, title, description || null, date, time, location,
      latitude || null, longitude || null, price ?? null,
      JSON.stringify(finalVibes),
      energyScore ?? enriched.energyScore,
      socialScore ?? enriched.socialScore,
      sourceType, rawText || null,
      now, now,
    );

    const created = req.db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    res.status(201).json({ ...created, vibes: JSON.parse(created.vibes) });
  } catch (err) {
    next(err);
  }
}

async function deleteEvent(req, res, next) {
  try {
    const event = req.db.prepare('SELECT id FROM events WHERE id = ?').get(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    req.db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { listEvents, getEvent, createEvent, deleteEvent, getMoodBreakdown };
