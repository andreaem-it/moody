/**
 * eventRepository
 *
 * All SQL for the `events` table lives here.
 * Business logic belongs in services/controllers — never in this file.
 *
 * PostgreSQL migration path:
 *   Replace getDb() calls with a pg Pool/Client; keep the same exported interface.
 */

const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeHash(title, date, location) {
  return `${title}${date}${location}`.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parse(row) {
  if (!row) return null;
  return {
    ...row,
    vibes: JSON.parse(row.vibes || '[]'),
    popularityBoost: row.popularityBoost || 0,
  };
}

// ─── Context helpers (used only internally by findByContext) ─────────────────

function todayUtc() {
  return new Date().toISOString().split('T')[0];
}

function weekendDates() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon, … 6=Sat

  // When today IS Sunday (day=0):  Saturday was yesterday (-1), Sunday is today (0).
  // Any other day: next Saturday = +(6-day), next Sunday = +(7-day).
  const daysToSat = day === 0 ? -1 : 6 - day;
  const daysToSun = day === 0 ?  0 : 7 - day;

  const sat = new Date(now); sat.setDate(now.getDate() + daysToSat);
  const sun = new Date(now); sun.setDate(now.getDate() + daysToSun);
  return [sat.toISOString().split('T')[0], sun.toISOString().split('T')[0]];
}

// ─── Public API ───────────────────────────────────────────────────────────────

const eventRepository = {
  /** All events, sorted chronologically. */
  findAll() {
    return getDb()
      .prepare('SELECT * FROM events ORDER BY date, time')
      .all()
      .map(parse);
  },

  findById(id) {
    return parse(getDb().prepare('SELECT * FROM events WHERE id = ?').get(id));
  },

  findByHash(hash) {
    return parse(getDb().prepare('SELECT * FROM events WHERE eventHash = ?').get(hash));
  },

  /**
   * Returns events filtered by context mode.
   * Extracted here so controllers stay free of SQL.
   */
  findByContext(context) {
    const db = getDb();
    const today = todayUtc();

    if (context === 'tonight') {
      return db.prepare('SELECT * FROM events WHERE date = ? ORDER BY time').all(today).map(parse);
    }

    if (context === 'last-minute') {
      const now = new Date();
      const cutoff = new Date(now.getTime() + 4 * 60 * 60 * 1000);
      const currentTime = now.toTimeString().slice(0, 5);
      const cutoffDate = cutoff.toISOString().split('T')[0];
      const cutoffTime = cutoff.toTimeString().slice(0, 5);

      if (cutoffDate === today) {
        return db
          .prepare('SELECT * FROM events WHERE date = ? AND time >= ? AND time <= ? ORDER BY time')
          .all(today, currentTime, cutoffTime)
          .map(parse);
      }
      return db
        .prepare(
          'SELECT * FROM events WHERE (date = ? AND time >= ?) OR (date = ? AND time <= ?) ORDER BY date, time',
        )
        .all(today, currentTime, cutoffDate, cutoffTime)
        .map(parse);
    }

    if (context === 'weekend') {
      const [sat, sun] = weekendDates();
      return db
        .prepare('SELECT * FROM events WHERE date IN (?, ?) ORDER BY date, time')
        .all(sat, sun)
        .map(parse);
    }

    // Fallback: everything from today onward
    return db
      .prepare('SELECT * FROM events WHERE date >= ? ORDER BY date, time')
      .all(today)
      .map(parse);
  },

  /**
   * Inserts a new event. Caller must pass already-enriched vibes/scores.
   * Returns the full created row.
   */
  create({ title, description, date, time, location, latitude, longitude, price, vibes = [], energyScore = 0.5, socialScore = 0.5, sourceType = 'manual', rawText = null }) {
    const id = uuidv4();
    const now = new Date().toISOString();
    const eventHash = normalizeHash(title, date, location);

    getDb()
      .prepare(`
        INSERT INTO events
          (id, title, description, date, time, location, latitude, longitude, price,
           vibes, energyScore, socialScore, sourceType, rawText, eventHash, popularityBoost, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
      `)
      .run(
        id, title, description ?? null, date, time, location,
        latitude ?? null, longitude ?? null, price ?? null,
        JSON.stringify(vibes), energyScore, socialScore,
        sourceType, rawText ?? null, eventHash, now, now,
      );

    return this.findById(id);
  },

  /** Increments popularityBoost when a duplicate hash is detected. */
  incrementPopularityBoost(id) {
    const now = new Date().toISOString();
    getDb()
      .prepare('UPDATE events SET popularityBoost = popularityBoost + 1, updatedAt = ? WHERE id = ?')
      .run(now, id);
    return this.findById(id);
  },

  /** Generic partial update — only touches supplied fields. */
  update(id, data) {
    const allowed = [
      'title', 'description', 'date', 'time', 'location',
      'latitude', 'longitude', 'price', 'vibes',
      'energyScore', 'socialScore', 'sourceType', 'rawText',
    ];
    const updates = [];
    const values = [];

    for (const key of allowed) {
      if (key in data) {
        updates.push(`${key} = ?`);
        values.push(key === 'vibes' ? JSON.stringify(data[key]) : data[key]);
      }
    }
    if (!updates.length) return this.findById(id);

    const now = new Date().toISOString();
    updates.push('updatedAt = ?');
    values.push(now, id);

    getDb().prepare(`UPDATE events SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    return this.findById(id);
  },

  delete(id) {
    getDb().prepare('DELETE FROM events WHERE id = ?').run(id);
  },
};

module.exports = eventRepository;
