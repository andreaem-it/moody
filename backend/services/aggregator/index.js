/**
 * aggregator/index.js
 *
 * Orchestratore principale dell'aggregazione eventi.
 *
 * Flusso per ogni fonte configurata:
 *   1. Fetch raw items dall'adapter
 *   2. Normalize → schema Event canonico
 *   3. Geocode (se lat/lng mancanti)
 *   4. Deduplication (hash esatto, poi fuzzy)
 *   5. Enrich (vibes, energyScore, socialScore via enrichmentService)
 *   6. Save su Firestore
 *
 * Ritorna un report strutturato con statistiche per fonte.
 */

'use strict';

const { normalize }                     = require('./normalizer');
const { geocodeBatch }                  = require('./geocoder');
const { checkDuplicate }                = require('./deduplicator');
const { fetchFeed: fetchRss }           = require('./adapters/rssAdapter');
const { fetchEventbrite }               = require('./adapters/eventbriteAdapter');
const { AGGREGATOR_SOURCES }            = require('../../config/aggregatorSources');
const eventRepository                   = require('../../repositories/eventRepository');
const { enrichEvent }                   = require('../enrichmentService');

// ─── Adapter registry ─────────────────────────────────────────────────────────

const ADAPTERS = {
  rss:        fetchRss,
  eventbrite: fetchEventbrite,
};

// ─── Cache eventi Firestore per data ─────────────────────────────────────────

/** Cache locale { dateStr -> Event[] } per ridurre i query di dedup fuzzy */
const _dateCache = new Map();

async function _getEventsForDate(dateStr) {
  if (_dateCache.has(dateStr)) return _dateCache.get(dateStr);
  const snap = await eventRepository.findByDate(dateStr);
  _dateCache.set(dateStr, snap);
  return snap;
}

// ─── Processing di un singolo item ───────────────────────────────────────────

/**
 * @param {object} rawItem     - Item grezzo dall'adapter
 * @param {string} sourceType  - 'rss' | 'eventbrite' | ...
 * @returns {Promise<'saved'|'duplicate'|'merged'|'skipped'>}
 */
async function _processItem(rawItem, sourceType) {
  // 1. Normalize
  const event = normalize(rawItem, sourceType);
  if (!event) return 'skipped';

  // 2. Geocode singolo (se lat/lng mancanti)
  let geocoded = event;
  if (event.latitude == null && event.location) {
    const [withCoords] = await geocodeBatch([event]);
    geocoded = withCoords;
  }

  // 3. Carica gli eventi già in Firestore per quella data (per fuzzy dedup)
  const dateCache = await _getEventsForDate(geocoded.date);

  // 4. Deduplication
  const { isDuplicate, existingId, merged } = await checkDuplicate(geocoded, dateCache);

  if (isDuplicate) {
    if (merged && existingId) {
      // Arricchisci il documento esistente con i campi mancanti
      await eventRepository.update(existingId, merged);
      // Aggiorna cache locale
      const idx = dateCache.findIndex((e) => e.id === existingId);
      if (idx >= 0) dateCache[idx] = { ...dateCache[idx], ...merged };
    }
    return 'duplicate';
  }

  // 5. Enrich — vibes + score
  let vibes        = geocoded.vibes;
  let energyScore  = geocoded.energyScore;
  let socialScore  = geocoded.socialScore;

  if (vibes.length === 0) {
    try {
      const enriched = await enrichEvent({
        title:       geocoded.title,
        description: geocoded.description,
        location:    geocoded.location,
        rawText:     geocoded.rawText,
      });
      vibes        = enriched.vibes       || vibes;
      energyScore  = enriched.energyScore ?? energyScore;
      socialScore  = enriched.socialScore ?? socialScore;
    } catch {
      // L'enrichment è non-bloccante; procedi con i valori di default
    }
  }

  // 6. Save
  const saved = await eventRepository.create({
    ...geocoded,
    vibes,
    energyScore,
    socialScore,
  });

  // Aggiorna cache locale per dedup successivi nella stessa run
  dateCache.push(saved);

  return 'saved';
}

// ─── API pubblica ─────────────────────────────────────────────────────────────

/**
 * Esegue l'aggregazione completa su tutte le fonti attive.
 *
 * @param {object} [options]
 * @param {string[]} [options.onlySources]  - Se specificato, aggrega solo le fonti con questo name
 * @param {boolean}  [options.dryRun=false] - Se true, non salva su Firestore
 * @returns {Promise<AggregatorReport>}
 */
async function runAggregation({ onlySources = null, dryRun = false } = {}) {
  _dateCache.clear();

  const activeSources = AGGREGATOR_SOURCES.filter((s) => {
    if (!s.enabled) return false;
    if (onlySources && !onlySources.includes(s.name)) return false;
    if (!ADAPTERS[s.type]) {
      console.warn(`[aggregator] Adapter "${s.type}" non implementato — fonte "${s.name}" saltata`);
      return false;
    }
    return true;
  });

  const report = {
    startedAt:  new Date().toISOString(),
    dryRun,
    sources:    [],
    totals:     { saved: 0, duplicate: 0, merged: 0, skipped: 0, errors: 0 },
  };

  for (const source of activeSources) {
    const sourceReport = {
      name:      source.name,
      type:      source.type,
      url:       source.url,
      saved:     0, duplicate: 0, merged: 0, skipped: 0, errors: 0,
      errorDetails: [],
    };

    console.log(`[aggregator] ▶ Fonte: ${source.name} (${source.url})`);

    let rawItems;
    try {
      rawItems = await ADAPTERS[source.type](source);
      console.log(`[aggregator]   ${rawItems.length} item trovati`);
    } catch (err) {
      console.error(`[aggregator] ✗ Errore fetch "${source.name}": ${err.message}`);
      sourceReport.errors++;
      sourceReport.errorDetails.push({ phase: 'fetch', error: err.message });
      report.sources.push(sourceReport);
      report.totals.errors++;
      continue;
    }

    for (const item of rawItems) {
      try {
        const result = dryRun ? 'skipped' : await _processItem(item, source.sourceType || source.type);
        sourceReport[result]++;
        report.totals[result]++;
      } catch (err) {
        console.error(`[aggregator]   ✗ Errore su item "${item.title}": ${err.message}`);
        sourceReport.errors++;
        report.totals.errors++;
        sourceReport.errorDetails.push({ phase: 'process', item: item.title, error: err.message });
      }
    }

    console.log(
      `[aggregator]   ✓ saved=${sourceReport.saved} dup=${sourceReport.duplicate} ` +
      `merged=${sourceReport.merged} skip=${sourceReport.skipped} err=${sourceReport.errors}`
    );
    report.sources.push(sourceReport);
  }

  report.finishedAt = new Date().toISOString();
  report.durationMs = new Date(report.finishedAt) - new Date(report.startedAt);

  console.log(
    `[aggregator] ✅ Completato in ${report.durationMs}ms — ` +
    `saved=${report.totals.saved} dup=${report.totals.duplicate} ` +
    `merged=${report.totals.merged} err=${report.totals.errors}`
  );

  return report;
}

module.exports = { runAggregation };
