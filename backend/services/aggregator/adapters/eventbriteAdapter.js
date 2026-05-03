/**
 * eventbriteAdapter.js
 *
 * Recupera eventi da Eventbrite API v3.
 * Filtra per: location Foligno/Umbria, categorie Music + Nightlife + Performing Arts.
 *
 * Prerequisiti:
 *   1. Registrarsi su https://www.eventbrite.com/platform/ (gratuito)
 *   2. Creare un'app e ottenere il token privato
 *   3. Impostare EVENTBRITE_API_KEY nel file backend/.env
 *
 * Per abilitarlo decommentare la voce in config/aggregatorSources.js.
 *
 * Documentazione API: https://www.eventbrite.com/platform/api
 */

'use strict';

const https = require('https');

const EVENTBRITE_BASE = 'www.eventbriteapi.com';

// Categorie Eventbrite per eventi di intrattenimento giovanile
// 103 = Music, 105 = Performing & Visual Arts, 107 = Food & Drink
// 113 = Community, 115 = Nightlife
const CATEGORIES = '103,105,115';

function _httpsGet(host, path, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: host,
      path,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch { reject(new Error(`Eventbrite: risposta non JSON`)); }
      });
    });
    req.on('error', reject);
    req.setTimeout(15_000, () => req.destroy(new Error('Eventbrite timeout')));
    req.end();
  });
}

/**
 * Converte un evento Eventbrite nel formato atteso dal normalizer.
 */
function _transformEvent(ev, venue) {
  const start  = ev.start?.local ?? '';         // "2026-05-15T21:00:00"
  const date   = start ? start.slice(0, 10) : null;
  const time   = start && start.length > 10 ? start.slice(11, 16) : null;

  const priceMin = ev.ticket_availability?.minimum_ticket_price?.value ?? null;

  return {
    title:       ev.name?.text        ?? '',
    description: ev.description?.text ?? ev.summary ?? null,
    date,
    time,
    location:    venue ? `${venue.name}, ${venue.address?.localized_address_display ?? ''}` : null,
    latitude:    venue?.latitude  ? parseFloat(venue.latitude)  : null,
    longitude:   venue?.longitude ? parseFloat(venue.longitude) : null,
    price:       priceMin !== null ? parseFloat(priceMin) : (ev.is_free ? 0 : null),
    vibes:       [],
    sourceUrl:   ev.url ?? null,
    rawText:     ev.summary ?? null,
  };
}

/**
 * Recupera eventi da Eventbrite per la regione configurata.
 *
 * @param {object} config - Fonte da aggregatorSources.js
 * @returns {Promise<object[]>}
 */
async function fetchEventbrite(config) {
  const token = process.env.EVENTBRITE_API_KEY;
  if (!token) throw new Error('EVENTBRITE_API_KEY non impostata nel .env');

  const params = new URLSearchParams({
    'location.address':       config.params?.['location.address']    ?? 'Foligno, Umbria, Italia',
    'location.within':        config.params?.['location.within']     ?? '50km',
    'start_date.range_start': config.params?.['start_date.range_start'] ?? new Date().toISOString(),
    categories:               CATEGORIES,
    expand:                   'venue',
    sort_by:                  'date',
    page_size:                '50',
  });

  const path     = `/v3/events/search/?${params.toString()}`;
  const response = await _httpsGet(EVENTBRITE_BASE, path, token);

  if (response.error) {
    throw new Error(`Eventbrite API error: ${response.error} — ${response.error_description}`);
  }

  const events = response.events ?? [];
  return events
    .filter((ev) => ev.status === 'live')
    .map((ev) => {
      const venue = ev.venue ?? null;
      return _transformEvent(ev, venue);
    })
    .filter((ev) => ev.title && ev.date);
}

module.exports = { fetchEventbrite };
