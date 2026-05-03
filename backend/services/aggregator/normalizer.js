/**
 * normalizer.js
 *
 * Converte qualsiasi oggetto grezzo proveniente da una fonte esterna
 * nel formato canonico atteso da eventRepository.create().
 *
 * Output garantito:
 *   { title, description, date, time, location,
 *     latitude, longitude, price, vibes, energyScore,
 *     socialScore, sourceType, sourceUrl, rawText }
 */

'use strict';

const MONTHS = {
  gennaio: '01', febbraio: '02', marzo: '03', aprile: '04',
  maggio: '05', giugno: '06', luglio: '07', agosto: '08',
  settembre: '09', ottobre: '10', novembre: '11', dicembre: '12',
};

// "3 maggio 2026", "03 maggio", "3-5-2026", "3/5/2026"
function parseItalianDate(text) {
  if (!text) return null;
  const s = text.trim();

  // ISO già formattato
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // DD/MM/YYYY o DD-MM-YYYY
  const slashMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (slashMatch) {
    const [, d, m, y] = slashMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // "DD mese YYYY" o "DD mese"
  const monthPattern = Object.keys(MONTHS).join('|');
  const textMatch = s.match(new RegExp(`(\\d{1,2})\\s+(${monthPattern})(?:\\s+(\\d{4}))?`, 'i'));
  if (textMatch) {
    const day   = textMatch[1].padStart(2, '0');
    const month = MONTHS[textMatch[2].toLowerCase()];
    const year  = textMatch[3] || String(new Date().getFullYear());
    return `${year}-${month}-${day}`;
  }

  return null;
}

// "21:30", "21.30", "ore 21", "h 21:30"
function parseTime(text) {
  if (!text) return null;
  const m = text.match(/(?:ore\s+|h\s*)?(\d{1,2})[:.](\d{2})/i);
  if (m) return `${String(parseInt(m[1], 10)).padStart(2, '0')}:${m[2]}`;
  const hOnly = text.match(/(?:ore\s+|h\s*)(\d{1,2})(?!\d)/i);
  if (hOnly) return `${String(parseInt(hOnly[1], 10)).padStart(2, '0')}:00`;
  return null;
}

// Cerca la prima occorrenza di data italiana in un testo libero
function extractDateFromText(text) {
  if (!text) return null;
  const monthPattern = Object.keys(MONTHS).join('|');
  const re = new RegExp(`(\\d{1,2})\\s+(${monthPattern})(?:\\s+(\\d{4}))?`, 'gi');
  const m = re.exec(text);
  if (m) {
    const day   = m[1].padStart(2, '0');
    const month = MONTHS[m[2].toLowerCase()];
    const year  = m[3] || String(new Date().getFullYear());
    return `${year}-${month}-${day}`;
  }
  // Fallback: DD/MM/YYYY nel testo
  const dm = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dm) return `${dm[3]}-${dm[2].padStart(2, '0')}-${dm[1].padStart(2, '0')}`;
  return null;
}

function extractTimeFromText(text) {
  if (!text) return null;
  return parseTime(text);
}

/**
 * Normalizza un evento grezzo nel formato canonico.
 *
 * @param {object} raw  - Oggetto proveniente da un adapter (RSS, Eventbrite, ecc.)
 * @param {string} sourceType - 'rss' | 'eventbrite' | 'manual' | 'user_upload'
 * @returns {object|null} - Evento normalizzato o null se i campi obbligatori mancano
 */
function normalize(raw, sourceType = 'rss') {
  const title = (raw.title || '').trim().replace(/\s+/g, ' ');
  if (!title) return null;

  // Data: campo esplicito > estrazione dal testo > pubDate dell'articolo
  let date =
    parseItalianDate(raw.date) ||
    extractDateFromText(raw.description) ||
    extractDateFromText(raw.title) ||
    (raw.pubDate ? raw.pubDate.toISOString?.().split('T')[0] ?? null : null);

  if (!date) return null; // senza data l'evento non è pubblicabile

  // Ora: campo esplicito > estrazione dal testo (descrizione > titolo)
  const time =
    parseTime(raw.time) ||
    extractTimeFromText(raw.description) ||
    extractTimeFromText(raw.title) ||
    '20:00'; // default serale

  const location    = (raw.location || raw.venue || '').trim() || null;
  const description = (raw.description || raw.summary || '').replace(/<[^>]+>/g, '').trim().slice(0, 1000) || null;

  // Prezzo: cerca "gratuito/free" o "€ X" nel testo
  let price = raw.price ?? null;
  if (price === null && description) {
    if (/grat[ui]/i.test(description)) price = 0;
    const priceMatch = description.match(/€\s*(\d+(?:[.,]\d+)?)/);
    if (priceMatch) price = parseFloat(priceMatch[1].replace(',', '.'));
  }

  return {
    title,
    description,
    date,
    time,
    location,
    latitude:     raw.latitude     ?? raw.lat ?? null,
    longitude:    raw.longitude    ?? raw.lng ?? null,
    price,
    vibes:        Array.isArray(raw.vibes) ? raw.vibes : [],
    energyScore:  raw.energyScore  ?? 0.5,
    socialScore:  raw.socialScore  ?? 0.5,
    sourceType,
    sourceUrl:    raw.sourceUrl    ?? raw.link ?? raw.url ?? null,
    rawText:      raw.rawText      ?? raw.contentSnippet ?? null,
  };
}

module.exports = { normalize, parseItalianDate, parseTime, extractDateFromText };
