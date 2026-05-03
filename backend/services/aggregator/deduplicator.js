/**
 * deduplicator.js
 *
 * Strategia a due livelli:
 *
 * 1. HASH ESATTO  — eventHash (title+date+location normalizzati) già presente su Firestore.
 *    Se match → duplicato certo, skip.
 *
 * 2. FUZZY        — Per la stessa data, confronta titolo (Dice coefficient ≥ 0.75)
 *    e, se disponibili, distanza geografica (≤ 300 m) tra le sedi.
 *    Se entrambe le condizioni sono vere → probabile duplicato.
 *    In questo caso "vince" la fonte con priorità più alta; i campi mancanti
 *    vengono integrati dalla fonte secondaria.
 *
 * Priorità fonti (più alto = più affidabile):
 *   user_upload > eventbrite > rss > scraped > manual
 */

'use strict';

const eventRepository = require('../../repositories/eventRepository');

/** Priorità fonte: più alto = più affidabile */
const SOURCE_PRIORITY = {
  user_upload: 5,
  eventbrite:  4,
  rss:         3,
  scraped:     2,
  manual:      1,
};

function sourcePriority(sourceType) {
  return SOURCE_PRIORITY[sourceType] ?? 0;
}

// ─── Algoritmo di similarità ──────────────────────────────────────────────────

function _normalize(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[àáâä]/g, 'a').replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i').replace(/[òóôö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\b(il|la|lo|i|gli|le|di|da|in|con|su|per|tra|fra|un|una|uno|del|della|dello|dei|degli|delle)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Dice coefficient su bigrammi — O(n), nessuna dipendenza esterna */
function diceCoefficient(a, b) {
  const na = _normalize(a);
  const nb = _normalize(b);
  if (na === nb) return 1;
  if (na.length < 2 || nb.length < 2) return 0;

  const getBigrams = (s) => {
    const bg = {};
    for (let i = 0; i < s.length - 1; i++) {
      const bi = s.slice(i, i + 2);
      bg[bi] = (bg[bi] || 0) + 1;
    }
    return bg;
  };

  const ba = getBigrams(na);
  const bb = getBigrams(nb);
  let intersection = 0;
  for (const bi in ba) {
    if (bb[bi]) intersection += Math.min(ba[bi], bb[bi]);
  }
  const totalA = na.length - 1;
  const totalB = nb.length - 1;
  return (2 * intersection) / (totalA + totalB);
}

/** Distanza approssimata in km (formula equirectangolare, errore < 0.3% per ≤ 50 km) */
function distanceKm(lat1, lng1, lat2, lng2) {
  const R   = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const mlat = ((lat1 + lat2) / 2) * (Math.PI / 180);
  return R * Math.sqrt(dLat * dLat + (Math.cos(mlat) * dLng) ** 2);
}

// ─── Merge di campi ───────────────────────────────────────────────────────────

/**
 * Unisce i campi di `secondary` in `primary` solo dove `primary` è null/undefined.
 * Non sovrascrive mai i campi già valorizzati nella fonte primaria.
 */
function mergeEvents(primary, secondary) {
  const MERGEABLE = ['description', 'latitude', 'longitude', 'price', 'vibes', 'sourceUrl'];
  const merged = { ...primary };
  for (const key of MERGEABLE) {
    if ((merged[key] === null || merged[key] === undefined) && secondary[key] != null) {
      merged[key] = secondary[key];
    }
    // Unione vibes: aggiungi quelle della fonte secondaria non ancora presenti
    if (key === 'vibes' && Array.isArray(secondary.vibes) && Array.isArray(merged.vibes)) {
      merged.vibes = [...new Set([...merged.vibes, ...secondary.vibes])];
    }
  }
  return merged;
}

// ─── API pubblica ─────────────────────────────────────────────────────────────

/**
 * Controlla se un evento normalizzato è già presente su Firestore.
 *
 * @param {object} event         - Evento normalizzato (output di normalizer.normalize)
 * @param {object[]} dateCache   - Cache locale di eventi già in Firestore per quella data
 *                                 (per evitare round-trip ripetuti)
 * @returns {Promise<{isDuplicate: boolean, existingId?: string, merged?: object}>}
 */
async function checkDuplicate(event, dateCache) {
  // 1. Hash esatto
  const hash = `${event.title}${event.date}${event.location || ''}`
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  const byHash = await eventRepository.findByHash(hash);
  if (byHash) {
    return { isDuplicate: true, existingId: byHash.id };
  }

  // 2. Fuzzy: stessa data, titolo simile, sede vicina
  const TITLE_THRESHOLD = 0.75;
  const DIST_THRESHOLD  = 0.3; // km

  for (const existing of dateCache) {
    const titleSim = diceCoefficient(event.title, existing.title);
    if (titleSim < TITLE_THRESHOLD) continue;

    // Se entrambi hanno coordinate, verifica anche la distanza
    if (
      event.latitude != null && event.longitude != null &&
      existing.latitude != null && existing.longitude != null
    ) {
      const km = distanceKm(event.latitude, event.longitude, existing.latitude, existing.longitude);
      if (km > DIST_THRESHOLD) continue;
    }

    // Duplicato fuzzy trovato → decide quale fonte prevale
    const newPriority      = sourcePriority(event.sourceType);
    const existingPriority = sourcePriority(existing.sourceType);

    if (newPriority > existingPriority) {
      // Nuovo ha priorità più alta → aggiorna il documento esistente con i dati del nuovo
      const merged = mergeEvents(event, existing);
      return { isDuplicate: true, existingId: existing.id, merged };
    }

    // Esistente ha priorità ≥ nuovo → scarta il nuovo, ma arricchisci l'esistente
    const merged = mergeEvents(existing, event);
    return { isDuplicate: true, existingId: existing.id, merged };
  }

  return { isDuplicate: false };
}

module.exports = { checkDuplicate, diceCoefficient, mergeEvents, sourcePriority };
