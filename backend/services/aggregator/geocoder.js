/**
 * geocoder.js
 *
 * Converte un indirizzo testuale in { lat, lng } usando Nominatim (OpenStreetMap).
 * - Completamente gratuito, nessuna API key necessaria.
 * - Rate limit: 1 req/sec (rispettato con una coda interna).
 * - Cache in memoria per la durata del processo (evita richieste ridondanti).
 */

'use strict';

const https = require('https');

const NOMINATIM_HOST  = 'nominatim.openstreetmap.org';
const REQUEST_DELAY_MS = 1200; // 1.2s tra richieste successive (limite è 1/s)
const USER_AGENT       = 'Moody-EventAggregator/1.0 (andreaemili@example.com)';

/** Cache in memoria { normalizedQuery -> { lat, lng } | null } */
const _cache = new Map();

/** Coda sequenziale per rispettare il rate limit */
let _lastRequestTime = 0;

function _sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function _httpsGet(url) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: NOMINATIM_HOST,
      path:     url,
      method:   'GET',
      headers: {
        'User-Agent': USER_AGENT,
        'Accept':     'application/json',
      },
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch {
          reject(new Error(`Nominatim: risposta non JSON — ${body.slice(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(10_000, () => { req.destroy(new Error('Nominatim timeout')); });
    req.end();
  });
}

/**
 * Geocodifica un indirizzo testuale.
 *
 * @param {string} address - Es. "Piazza della Repubblica, Foligno, PG"
 * @param {string} [countryCode='it'] - Filtro paese (ISO 3166-1 alpha-2)
 * @returns {Promise<{lat: number, lng: number} | null>}
 */
async function geocode(address, countryCode = 'it') {
  if (!address || !address.trim()) return null;

  const cacheKey = `${address.toLowerCase().trim()}|${countryCode}`;
  if (_cache.has(cacheKey)) return _cache.get(cacheKey);

  // Rate limit
  const elapsed = Date.now() - _lastRequestTime;
  if (elapsed < REQUEST_DELAY_MS) {
    await _sleep(REQUEST_DELAY_MS - elapsed);
  }

  const query = encodeURIComponent(address.trim());
  const path  = `/search?q=${query}&countrycodes=${countryCode}&format=json&limit=1&addressdetails=0`;

  _lastRequestTime = Date.now();

  let results;
  try {
    results = await _httpsGet(path);
  } catch (err) {
    console.warn(`[geocoder] Errore per "${address}": ${err.message}`);
    _cache.set(cacheKey, null);
    return null;
  }

  if (!Array.isArray(results) || results.length === 0) {
    _cache.set(cacheKey, null);
    return null;
  }

  const { lat, lon } = results[0];
  const coords = { lat: parseFloat(lat), lng: parseFloat(lon) };
  _cache.set(cacheKey, coords);
  return coords;
}

/**
 * Geocodifica in batch rispettando il rate limit.
 * Aggiorna in-place i campi latitude/longitude degli eventi.
 *
 * @param {Array<object>} events - Lista eventi normalizzati
 * @returns {Promise<Array<object>>} - Stessa lista con lat/lng compilati dove possibile
 */
async function geocodeBatch(events) {
  const results = [];
  for (const event of events) {
    if (event.latitude != null && event.longitude != null) {
      results.push(event);
      continue;
    }
    if (!event.location) {
      results.push(event);
      continue;
    }
    // Arricchisce la query con il contesto geografico di default se l'indirizzo è breve
    const query  = event.location.length < 20
      ? `${event.location}, Umbria, Italia`
      : event.location;

    const coords = await geocode(query);
    results.push(coords ? { ...event, latitude: coords.lat, longitude: coords.lng } : event);
  }
  return results;
}

/** Svuota la cache (utile tra run successivi di test) */
function clearCache() {
  _cache.clear();
}

module.exports = { geocode, geocodeBatch, clearCache };
