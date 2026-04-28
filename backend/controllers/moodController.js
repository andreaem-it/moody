const { v4: uuidv4 } = require('uuid');

const VALID_MOODS = ['fire', 'mid', 'dead'];

function computeMoodBreakdown(db, eventId) {
  const votes = db.prepare('SELECT value FROM moods WHERE eventId = ?').all(eventId);
  const total = votes.length;

  if (!total) {
    return { dominantMood: null, moodBreakdown: { fire: 0, mid: 0, dead: 0 }, totalVotes: 0 };
  }

  const counts = votes.reduce((acc, v) => {
    acc[v.value] = (acc[v.value] || 0) + 1;
    return acc;
  }, { fire: 0, mid: 0, dead: 0 });

  const dominantMood = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];

  return {
    dominantMood,
    moodBreakdown: {
      fire: Math.round((counts.fire / total) * 100),
      mid: Math.round((counts.mid / total) * 100),
      dead: Math.round((counts.dead / total) * 100),
    },
    totalVotes: total,
  };
}

async function postMood(req, res, next) {
  try {
    const { id: eventId } = req.params;
    const { userId = 'demo-user', value } = req.body;

    if (!VALID_MOODS.includes(value)) {
      return res.status(400).json({ error: `Invalid mood. Must be one of: ${VALID_MOODS.join(', ')}` });
    }

    const event = req.db.prepare('SELECT id FROM events WHERE id = ?').get(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const now = new Date().toISOString();
    const existing = req.db.prepare('SELECT id FROM moods WHERE eventId = ? AND userId = ?').get(eventId, userId);

    if (existing) {
      req.db.prepare('UPDATE moods SET value = ?, updatedAt = ? WHERE id = ?').run(value, now, existing.id);
    } else {
      req.db.prepare('INSERT INTO moods (id, eventId, userId, value, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)').run(
        uuidv4(), eventId, userId, value, now, now,
      );
    }

    const breakdown = computeMoodBreakdown(req.db, eventId);
    res.json({ success: true, ...breakdown });
  } catch (err) {
    next(err);
  }
}

async function getMood(req, res, next) {
  try {
    const { id: eventId } = req.params;
    const event = req.db.prepare('SELECT id FROM events WHERE id = ?').get(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const breakdown = computeMoodBreakdown(req.db, eventId);
    res.json({ eventId, ...breakdown });
  } catch (err) {
    next(err);
  }
}

module.exports = { postMood, getMood };
