const { getOrCreateProfile } = require('../services/profileService');
const { rankEvents } = require('../services/rankingService');
const { getMoodBreakdown } = require('./eventsController');

// Default location: Milan city center
const DEFAULT_LAT = 45.4642;
const DEFAULT_LNG = 9.1900;

function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

function getWeekendDates() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun…6=Sat
  const daysToSat = day === 6 ? 0 : 6 - day;
  const daysToSun = day === 0 ? 0 : 7 - day;

  const sat = new Date(now);
  sat.setDate(now.getDate() + daysToSat);

  const sun = new Date(now);
  sun.setDate(now.getDate() + daysToSun);

  return [sat.toISOString().split('T')[0], sun.toISOString().split('T')[0]];
}

function getEventsByContext(db, context) {
  const today = getTodayString();

  if (context === 'tonight') {
    return db.prepare("SELECT * FROM events WHERE date = ?").all(today);
  }

  if (context === 'last-minute') {
    const now = new Date();
    const cutoff = new Date(now.getTime() + 4 * 60 * 60 * 1000);
    const currentTime = now.toTimeString().slice(0, 5);
    const cutoffDate = cutoff.toISOString().split('T')[0];
    const cutoffTime = cutoff.toTimeString().slice(0, 5);

    if (cutoffDate === today) {
      return db.prepare(
        "SELECT * FROM events WHERE date = ? AND time >= ? AND time <= ?"
      ).all(today, currentTime, cutoffTime);
    }
    // Crosses midnight
    return db.prepare(
      "SELECT * FROM events WHERE (date = ? AND time >= ?) OR (date = ? AND time <= ?)"
    ).all(today, currentTime, cutoffDate, cutoffTime);
  }

  if (context === 'weekend') {
    const [sat, sun] = getWeekendDates();
    return db.prepare("SELECT * FROM events WHERE date IN (?, ?)").all(sat, sun);
  }

  // Fallback: upcoming events
  return db.prepare("SELECT * FROM events WHERE date >= ? ORDER BY date, time").all(today);
}

async function getFeed(req, res, next) {
  try {
    const { context = 'tonight', lat, lng, userId = 'demo-user' } = req.query;
    const db = req.db;

    const profile = getOrCreateProfile(db, userId);
    const events = getEventsByContext(db, context);

    // Attach live data to each event before ranking
    const enrichedEvents = events.map((event) => {
      const peopleCount = db.prepare('SELECT COUNT(*) as c FROM checkins WHERE eventId = ?').get(event.id).c;
      const moodData = getMoodBreakdown(db, event.id);
      return {
        ...event,
        vibes: JSON.parse(event.vibes || '[]'),
        peopleCount,
        ...moodData,
      };
    });

    const userLat = lat ? parseFloat(lat) : DEFAULT_LAT;
    const userLng = lng ? parseFloat(lng) : DEFAULT_LNG;

    const ranked = rankEvents(enrichedEvents, profile, context, userLat, userLng);

    res.json({ context, events: ranked });
  } catch (err) {
    next(err);
  }
}

module.exports = { getFeed };
