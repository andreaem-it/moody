/**
 * eventRepository — Firestore implementation.
 *
 * Document structure (collection: 'events'):
 *   id, title, description, date, time, location,
 *   latitude, longitude, price, vibes (array), energyScore,
 *   socialScore, sourceType, sourceUrl, rawText, eventHash,
 *   popularityBoost, createdAt, updatedAt
 */

const { v4: uuidv4 }        = require('uuid');
const { getDb }             = require('../db/database');
const { FieldValue }        = require('firebase-admin/firestore');

const COL = 'events';

function _parse(snap) {
  if (!snap || !snap.exists) return null;
  const data = snap.data();
  return {
    ...data,
    id: snap.id,
    vibes: Array.isArray(data.vibes) ? data.vibes : [],
    popularityBoost: data.popularityBoost || 0,
  };
}

function _normalizeHash(title, date, location) {
  return `${title}${date}${location}`.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function _todayUtc() {
  return new Date().toISOString().split('T')[0];
}

function _weekendDates() {
  const now = new Date();
  const day = now.getDay();
  const daysToSat = day === 0 ? -1 : 6 - day;
  const daysToSun = day === 0 ?  0 : 7 - day;
  const sat = new Date(now); sat.setDate(now.getDate() + daysToSat);
  const sun = new Date(now); sun.setDate(now.getDate() + daysToSun);
  return [sat.toISOString().split('T')[0], sun.toISOString().split('T')[0]];
}

const eventRepository = {
  async findAll() {
    const snap = await getDb()
      .collection(COL)
      .orderBy('date')
      .orderBy('time')
      .get();
    return snap.docs.map(_parse);
  },

  async findById(id) {
    const snap = await getDb().collection(COL).doc(id).get();
    return _parse(snap);
  },

  /** Ritorna tutti gli eventi per una data specifica (YYYY-MM-DD). Usato dal deduplicator. */
  async findByDate(dateStr) {
    const snap = await getDb()
      .collection(COL)
      .where('date', '==', dateStr)
      .get();
    return snap.docs.map(_parse);
  },

  async findByHash(hash) {
    const snap = await getDb()
      .collection(COL)
      .where('eventHash', '==', hash)
      .limit(1)
      .get();
    return snap.empty ? null : _parse(snap.docs[0]);
  },

  async findByContext(context) {
    const db    = getDb();
    const today = _todayUtc();

    if (context === 'tonight') {
      const snap = await db
        .collection(COL)
        .where('date', '==', today)
        .orderBy('time')
        .get();
      return snap.docs.map(_parse);
    }

    if (context === 'last-minute') {
      const now        = new Date();
      const cutoff     = new Date(now.getTime() + 4 * 60 * 60 * 1000);
      const currentTime = now.toTimeString().slice(0, 5);
      const cutoffDate  = cutoff.toISOString().split('T')[0];
      const cutoffTime  = cutoff.toTimeString().slice(0, 5);

      if (cutoffDate === today) {
        const snap = await db
          .collection(COL)
          .where('date', '==', today)
          .where('time', '>=', currentTime)
          .where('time', '<=', cutoffTime)
          .orderBy('time')
          .get();
        return snap.docs.map(_parse);
      }

      const [todaySnap, tomorrowSnap] = await Promise.all([
        db.collection(COL).where('date', '==', today).where('time', '>=', currentTime).get(),
        db.collection(COL).where('date', '==', cutoffDate).where('time', '<=', cutoffTime).get(),
      ]);
      return [...todaySnap.docs, ...tomorrowSnap.docs].map(_parse);
    }

    if (context === 'weekend') {
      const [sat, sun] = _weekendDates();
      const [satSnap, sunSnap] = await Promise.all([
        db.collection(COL).where('date', '==', sat).orderBy('time').get(),
        db.collection(COL).where('date', '==', sun).orderBy('time').get(),
      ]);
      return [...satSnap.docs, ...sunSnap.docs].map(_parse);
    }

    // Fallback: from today onward
    const snap = await db
      .collection(COL)
      .where('date', '>=', today)
      .orderBy('date')
      .orderBy('time')
      .get();
    return snap.docs.map(_parse);
  },

  async create({ title, description, date, time, location, latitude, longitude, price, vibes = [], energyScore = 0.5, socialScore = 0.5, sourceType = 'manual', sourceUrl = null, rawText = null }) {
    const id        = uuidv4();
    const now       = new Date().toISOString();
    const eventHash = _normalizeHash(title, date, location);

    const data = {
      id, title,
      description:    description ?? null,
      date, time, location,
      latitude:       latitude    ?? null,
      longitude:      longitude   ?? null,
      price:          price       ?? null,
      vibes,
      energyScore,
      socialScore,
      sourceType,
      sourceUrl:      sourceUrl   ?? null,
      rawText:        rawText     ?? null,
      eventHash,
      popularityBoost: 0,
      createdAt: now,
      updatedAt: now,
    };

    await getDb().collection(COL).doc(id).set(data);
    return data;
  },

  async incrementPopularityBoost(id) {
    const now = new Date().toISOString();
    await getDb().collection(COL).doc(id).update({
      popularityBoost: FieldValue.increment(1),
      updatedAt: now,
    });
    return this.findById(id);
  },

  async update(id, data) {
    const allowed = [
      'title', 'description', 'date', 'time', 'location',
      'latitude', 'longitude', 'price', 'vibes',
      'energyScore', 'socialScore', 'sourceType', 'sourceUrl', 'rawText',
    ];
    const updates = { updatedAt: new Date().toISOString() };

    for (const key of allowed) {
      if (key in data) updates[key] = data[key];
    }

    if (Object.keys(updates).length > 1) {
      await getDb().collection(COL).doc(id).update(updates);
    }
    return this.findById(id);
  },

  async delete(id) {
    await getDb().collection(COL).doc(id).delete();
  },
};

module.exports = eventRepository;
