/**
 * eventsController
 * Handles CRUD for events + event detail with live data.
 */

const { enrichEvent }                    = require('../services/enrichmentService');
const eventRepository                    = require('../repositories/eventRepository');
const checkinRepository                  = require('../repositories/checkinRepository');
const moodRepository                     = require('../repositories/moodRepository');
const { organizerRepository }            = require('../repositories/organizerRepository');

async function listEvents(_req, res, next) {
  try {
    const events = await eventRepository.findAll();
    const result = await Promise.all(
      events.map(async (event) => ({
        ...event,
        peopleCount: await checkinRepository.countByEvent(event.id),
        ...await moodRepository.getBreakdown(event.id),
      })),
    );
    res.json(result);
  } catch (err) { next(err); }
}

async function searchEvents(req, res, next) {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    if (q.trim().length < 2) {
      return res.json([]);
    }
    const events = await eventRepository.searchUpcoming(q);
    const result = await Promise.all(
      events.map(async (event) => ({
        ...event,
        peopleCount: await checkinRepository.countByEvent(event.id),
        ...await moodRepository.getBreakdown(event.id),
      })),
    );
    res.json(result);
  } catch (err) { next(err); }
}

async function getEvent(req, res, next) {
  try {
    const event = await eventRepository.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const [peopleCount, momentumCount, breakdown] = await Promise.all([
      checkinRepository.countByEvent(event.id),
      checkinRepository.countRecent(event.id, 120),
      moodRepository.getBreakdown(event.id),
    ]);

    res.json({ ...event, peopleCount, momentumCount, ...breakdown });
  } catch (err) { next(err); }
}

async function createEvent(req, res, next) {
  try {
    const {
      title, description, date, time, location,
      latitude, longitude, price, vibes = [],
      energyScore, socialScore, sourceType = 'manual', rawText,
      organizerUserId,  // opzionale: userId dell'organizzatore — abilita quota check
    } = req.body;

    if (!title || !date || !time || !location) {
      return res.status(400).json({ error: 'title, date, time and location are required' });
    }

    // ── Quota check per eventi degli organizzatori ─────────────────────────────
    let organizerId = null;
    if (organizerUserId) {
      const organizer = await organizerRepository.findByUserId(organizerUserId);
      if (!organizer) {
        return res.status(403).json({ error: 'Profilo Moody+ non trovato. Registrati prima come organizzatore.' });
      }
      if (!organizer.isActive) {
        return res.status(403).json({ error: 'Account Moody+ sospeso.' });
      }
      const quota = await organizerRepository.consumeQuota(organizer.id);
      if (!quota.success) {
        return res.status(402).json({
          error: 'Quota submission esaurita. Acquista un pacchetto per continuare a pubblicare.',
          quotaExceeded: true,
        });
      }
      organizerId = organizer.id;
    }

    const hash     = `${title}${date}${location}`.toLowerCase().replace(/[^a-z0-9]/g, '');
    const existing = await eventRepository.findByHash(hash);
    if (existing) {
      const updated = await eventRepository.incrementPopularityBoost(existing.id);
      return res.status(200).json({ ...updated, isDuplicate: true });
    }

    const enriched = enrichEvent({ title, description: description || '', rawText: rawText || '' });
    const created  = await eventRepository.create({
      title, description, date, time, location,
      latitude, longitude, price,
      vibes:       vibes.length ? vibes : enriched.vibes,
      energyScore: energyScore  ?? enriched.energyScore,
      socialScore: socialScore  ?? enriched.socialScore,
      sourceType:  organizerId ? 'organizer' : sourceType,
      rawText,
      organizerId,
    });

    res.status(201).json(created);
  } catch (err) { next(err); }
}

async function deleteEvent(req, res, next) {
  try {
    const event = await eventRepository.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    await eventRepository.delete(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
}

module.exports = { listEvents, searchEvents, getEvent, createEvent, deleteEvent };
