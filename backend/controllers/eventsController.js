/**
 * eventsController
 * Handles CRUD for events + event detail with live data.
 * All DB access is delegated to repositories.
 */

const { enrichEvent } = require('../services/enrichmentService');
const eventRepository = require('../repositories/eventRepository');
const checkinRepository = require('../repositories/checkinRepository');
const moodRepository = require('../repositories/moodRepository');

// ─── Controllers ──────────────────────────────────────────────────────────────

async function listEvents(_req, res, next) {
  try {
    const events = eventRepository.findAll();
    const result = events.map((event) => ({
      ...event,
      peopleCount: checkinRepository.countByEvent(event.id),
      ...moodRepository.getBreakdown(event.id),
    }));
    res.json(result);
  } catch (err) { next(err); }
}

async function getEvent(req, res, next) {
  try {
    const event = eventRepository.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    res.json({
      ...event,
      peopleCount:   checkinRepository.countByEvent(event.id),
      momentumCount: checkinRepository.countRecent(event.id, 120),   // last 2 h
      ...moodRepository.getBreakdown(event.id),
    });
  } catch (err) { next(err); }
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

    // ── Deduplication ──
    const hash = `${title}${date}${location}`.toLowerCase().replace(/[^a-z0-9]/g, '');
    const existing = eventRepository.findByHash(hash);
    if (existing) {
      const updated = eventRepository.incrementPopularityBoost(existing.id);
      return res.status(200).json({ ...updated, isDuplicate: true });
    }

    // ── Create ──
    const enriched = enrichEvent({ title, description: description || '', rawText: rawText || '' });
    const created = eventRepository.create({
      title, description, date, time, location,
      latitude, longitude, price,
      vibes: vibes.length ? vibes : enriched.vibes,
      energyScore:  energyScore  ?? enriched.energyScore,
      socialScore:  socialScore  ?? enriched.socialScore,
      sourceType, rawText,
    });

    res.status(201).json(created);
  } catch (err) { next(err); }
}

async function deleteEvent(req, res, next) {
  try {
    const event = eventRepository.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    eventRepository.delete(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
}

module.exports = { listEvents, getEvent, createEvent, deleteEvent };
