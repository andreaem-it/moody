/**
 * rssAdapter.js
 *
 * Recupera e trasforma un feed RSS/Atom in una lista di oggetti grezzi
 * compatibili con normalizer.normalize().
 *
 * Gestisce:
 *  - Feed standard RSS 2.0 e Atom
 *  - Campi custom degli eventi (<event:startDate>, <geo:lat>, ecc.)
 *  - Estrazione di data/ora dal testo italiano nella descrizione
 *  - Rimozione HTML dalla descrizione
 *  - Timeout configurabile per feed lenti
 */

'use strict';

const RSSParser = require('rss-parser');

const { extractDateFromText } = require('../normalizer');

const FETCH_TIMEOUT_MS = 15_000;

/** Rimuove tag HTML e decodifica entità HTML comuni */
function stripHtml(text) {
  if (!text) return '';
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Cerca l'ora nel testo in formato italiano */
function extractTimeFromText(text) {
  if (!text) return null;
  const m = text.match(/(?:ore\s+|h\s*|dalle\s+)?(\d{1,2})[:.](\d{2})/i);
  if (m) return `${String(parseInt(m[1], 10)).padStart(2, '0')}:${m[2]}`;
  const hOnly = text.match(/(?:ore|h)\s+(\d{1,2})(?!\d|[:.])(?:\s|$)/i);
  if (hOnly) return `${String(parseInt(hOnly[1], 10)).padStart(2, '0')}:00`;
  return null;
}

/** Cerca il luogo nel testo ("presso X", "a X", "in piazza X", ecc.) */
function extractLocationFromText(text) {
  if (!text) return null;
  const patterns = [
    /(?:presso|alla?|allo?|all'|in|nel|nella)\s+((?:[A-Z][a-zàèìòùé]+\s*){1,5})/,
    /(?:Piazza|Via|Corso|Largo|Viale|Teatro|Auditorium|Palazzo|Chiesa|Biblioteca)\s+[A-ZÀ-Ú][a-zàèìòùé\s,]*/,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return m[0].trim().slice(0, 100);
  }
  return null;
}

/**
 * Trasforma un item di feed RSS grezzo in un oggetto pre-normalizzato.
 *
 * @param {object} item    - Item parsato da rss-parser
 * @param {object} config  - Configurazione del feed (dal aggregatorSources)
 * @returns {object}
 */
function transformItem(item, config) {
  const titleRaw       = item.title         || '';
  const descriptionRaw = item.contentSnippet || item.summary || item.content || item['content:encoded'] || '';
  const description    = stripHtml(descriptionRaw).slice(0, 1500);
  const fullText       = `${titleRaw} ${description}`;

  // Data: il campo event:startDate è il più preciso; altrimenti cerca nel testo
  const date =
    (item['event:startDate'] ? item['event:startDate'].slice(0, 10) : null) ||
    extractDateFromText(description) ||
    extractDateFromText(titleRaw);

  const time =
    (item['event:startTime'] || null) ||
    extractTimeFromText(description) ||
    extractTimeFromText(titleRaw);

  // Localizzazione: campo geo:lat/lon, oppure campo esplicito, oppure regex nel testo
  const lat = item['geo:lat']   ? parseFloat(item['geo:lat'])  : null;
  const lng = item['geo:long']  ? parseFloat(item['geo:long']) : null;

  const location =
    item['event:location'] ||
    item.location ||
    extractLocationFromText(description) ||
    config.defaultLocation ||
    null;

  return {
    title:       titleRaw.trim(),
    description,
    date,
    time,
    location,
    latitude:  lat,
    longitude: lng,
    price:     null,
    vibes:     [],
    sourceUrl: item.link || item.guid || null,
    rawText:   fullText.slice(0, 500),
    pubDate:   item.pubDate ? new Date(item.pubDate) : null,
  };
}

/**
 * Recupera tutti gli item da un singolo feed RSS.
 *
 * @param {object} feedConfig - Oggetto dal array `sources` in aggregatorSources.js
 * @returns {Promise<object[]>} - Lista di oggetti grezzi pre-normalizzati
 */
async function fetchFeed(feedConfig) {
  const parser = new RSSParser({
    timeout:    FETCH_TIMEOUT_MS,
    customFields: {
      item: [
        ['event:startDate', 'event:startDate'],
        ['event:startTime', 'event:startTime'],
        ['event:location',  'event:location'],
        ['geo:lat',         'geo:lat'],
        ['geo:long',        'geo:long'],
        ['content:encoded', 'content:encoded'],
      ],
    },
  });

  let feed;
  try {
    feed = await parser.parseURL(feedConfig.url);
  } catch (err) {
    throw new Error(`[rssAdapter] Impossibile caricare "${feedConfig.url}": ${err.message}`);
  }

  const items = (feed.items || [])
    .map((item) => transformItem(item, feedConfig))
    .filter((item) => {
      // Filtra item senza titolo o senza data recuperabile
      if (!item.title) return false;
      if (!item.date)  return false;
      // Filtra item con data nel passato (più di 3 giorni fa)
      const eventDate = new Date(item.date);
      const cutoff    = new Date();
      cutoff.setDate(cutoff.getDate() - 3);
      if (eventDate < cutoff) return false;
      return true;
    });

  return items;
}

module.exports = { fetchFeed };
