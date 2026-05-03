/**
 * organizerController
 *
 * Gestisce:
 *   - Registrazione come organizzatore
 *   - Profilo e aggiornamento
 *   - Quota attuale
 *   - Lista eventi pubblicati con statistiche aggregate
 *   - Elenco pacchetti acquistabili
 *   - Richiesta acquisto pacchetto (pre-Stripe: invia email / flag manuale)
 */

'use strict';

const { organizerRepository, PACKAGES } = require('../repositories/organizerRepository');
const eventRepository                    = require('../repositories/eventRepository');
const feedbackRepository                 = require('../repositories/feedbackRepository');
const checkinRepository                  = require('../repositories/checkinRepository');

// ─── Registrazione ────────────────────────────────────────────────────────────

async function register(req, res, next) {
  try {
    const { userId, venueName, contactName, email, city, description } = req.body;

    if (!userId || !venueName || !contactName || !email || !city) {
      return res.status(400).json({
        error: 'Campi obbligatori mancanti: userId, venueName, contactName, email, city',
      });
    }

    const existing = await organizerRepository.findByUserId(userId);
    if (existing) {
      return res.status(409).json({ error: 'Profilo organizzatore già esistente per questo userId.' });
    }

    const organizer = await organizerRepository.create({ userId, venueName, contactName, email, city, description });
    res.status(201).json(organizer);
  } catch (err) { next(err); }
}

// ─── Profilo ─────────────────────────────────────────────────────────────────

async function getProfile(req, res, next) {
  try {
    const organizer = await organizerRepository.findByUserId(req.params.userId);
    if (!organizer) return res.status(404).json({ error: 'Profilo organizzatore non trovato.' });
    res.json(organizer);
  } catch (err) { next(err); }
}

async function updateProfile(req, res, next) {
  try {
    const organizer = await organizerRepository.findByUserId(req.params.userId);
    if (!organizer) return res.status(404).json({ error: 'Profilo organizzatore non trovato.' });

    const updated = await organizerRepository.update(organizer.id, req.body);
    res.json(updated);
  } catch (err) { next(err); }
}

// ─── Quota ────────────────────────────────────────────────────────────────────

async function getQuota(req, res, next) {
  try {
    const organizer = await organizerRepository.findByUserId(req.params.userId);
    if (!organizer) return res.status(404).json({ error: 'Profilo organizzatore non trovato.' });

    res.json({
      quotaTotal:     organizer.quotaTotal,
      quotaUsed:      organizer.quotaUsed,
      quotaRemaining: organizer.quotaTotal - organizer.quotaUsed,
      plan:           organizer.plan,
    });
  } catch (err) { next(err); }
}

// ─── Statistiche eventi ───────────────────────────────────────────────────────

async function getEventStats(req, res, next) {
  try {
    const organizer = await organizerRepository.findByUserId(req.params.userId);
    if (!organizer) return res.status(404).json({ error: 'Profilo organizzatore non trovato.' });

    const events = await eventRepository.findByOrganizerId(organizer.id);

    const eventsWithStats = await Promise.all(
      events.map(async (event) => {
        const [likes, skips, checkins] = await Promise.all([
          feedbackRepository.countByEventAndType(event.id, 'like'),
          feedbackRepository.countByEventAndType(event.id, 'skip'),
          checkinRepository.countByEvent(event.id),
        ]);
        const total      = likes + skips;
        const conversion = total > 0 ? Math.round((likes / total) * 100) : null;
        return {
          id:         event.id,
          title:      event.title,
          date:       event.date,
          time:       event.time,
          location:   event.location,
          vibes:      event.vibes,
          sourceUrl:  event.sourceUrl ?? null,
          createdAt:  event.createdAt,
          stats: { likes, skips, checkins, conversion },
        };
      }),
    );

    // Totali aggregati
    const totals = eventsWithStats.reduce(
      (acc, e) => ({
        likes:    acc.likes    + e.stats.likes,
        skips:    acc.skips    + e.stats.skips,
        checkins: acc.checkins + e.stats.checkins,
      }),
      { likes: 0, skips: 0, checkins: 0 },
    );
    const totalInteractions = totals.likes + totals.skips;
    totals.conversion = totalInteractions > 0
      ? Math.round((totals.likes / totalInteractions) * 100)
      : null;

    res.json({
      organizer: {
        id:           organizer.id,
        venueName:    organizer.venueName,
        plan:         organizer.plan,
        quotaTotal:   organizer.quotaTotal,
        quotaUsed:    organizer.quotaUsed,
      },
      events:  eventsWithStats,
      totals,
    });
  } catch (err) { next(err); }
}

// ─── Pacchetti ────────────────────────────────────────────────────────────────

function getPackages(_req, res) {
  res.json({ packages: PACKAGES });
}

/**
 * Richiesta acquisto pacchetto.
 * Per ora registra la richiesta con flag `pendingPurchase` e risponde con istruzioni.
 * In futuro verrà sostituito con un checkout Stripe.
 */
async function requestPurchase(req, res, next) {
  try {
    const { packageId } = req.body;
    const pkg = PACKAGES.find((p) => p.id === packageId);
    if (!pkg) return res.status(400).json({ error: 'Pacchetto non valido.' });

    const organizer = await organizerRepository.findByUserId(req.params.userId);
    if (!organizer) return res.status(404).json({ error: 'Profilo organizzatore non trovato.' });

    // Log della richiesta su Firestore (collezione separata per audit)
    const { getDb } = require('../db/database');
    const { v4: uuidv4 } = require('uuid');
    await getDb().collection('purchase_requests').doc(uuidv4()).set({
      organizerId: organizer.id,
      userId:      organizer.userId,
      venueName:   organizer.venueName,
      email:       organizer.email,
      packageId,
      packageLabel: pkg.label,
      amount:      pkg.submissions,
      price:       pkg.price,
      status:      'pending',
      createdAt:   new Date().toISOString(),
    });

    res.status(202).json({
      message: `Richiesta per "${pkg.label}" (${pkg.submissions} submission, €${pkg.price}) ricevuta. ` +
               `Riceverai una conferma all'indirizzo ${organizer.email} entro 24h con le istruzioni di pagamento.`,
      package: pkg,
    });
  } catch (err) { next(err); }
}

module.exports = { register, getProfile, updateProfile, getQuota, getEventStats, getPackages, requestPurchase };
