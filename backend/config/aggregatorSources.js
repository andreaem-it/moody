/**
 * aggregatorSources.js
 *
 * Elenco delle fonti dati per l'aggregatore eventi.
 * Ogni fonte può essere abilitata/disabilitata tramite il campo `enabled`.
 *
 * Struttura di una fonte:
 * {
 *   name:            string   — identificatore leggibile
 *   type:            'rss' | 'eventbrite'
 *   sourceType:      string   — valore salvato in Event.sourceType (es. 'rss', 'eventbrite')
 *   url:             string   — URL del feed/endpoint
 *   enabled:         boolean  — se false viene saltata
 *   defaultLocation: string   — location di fallback se non estraibile dall'item
 * }
 *
 * Per aggiungere un nuovo feed basta aggiungere un entry qui.
 * Non è necessario modificare nessun altro file.
 */

'use strict';

const AGGREGATOR_SOURCES = [
  // ── Umbria24 — sezione eventi / cultura ─────────────────────────────────────
  {
    name:            'umbria24-eventi',
    type:            'rss',
    sourceType:      'rss',
    url:             'https://www.umbria24.it/feed/?cat=eventi',
    enabled:         true,
    defaultLocation: 'Umbria, Italia',
  },

  // ── Il Messaggero Umbria — cultura e spettacoli ──────────────────────────────
  {
    name:            'messaggero-umbria',
    type:            'rss',
    sourceType:      'rss',
    url:             'https://www.ilmessaggero.it/rss/umbria.xml',
    enabled:         true,
    defaultLocation: 'Umbria, Italia',
  },

  // ── Turismo Umbria (portale regionale) ───────────────────────────────────────
  {
    name:            'umbriatourism',
    type:            'rss',
    sourceType:      'rss',
    url:             'https://www.umbriatourism.it/it/eventi?format=feed&type=rss',
    enabled:         true,
    defaultLocation: 'Umbria, Italia',
  },

  // ── VivoUmbria — eventi locali ───────────────────────────────────────────────
  {
    name:            'vivoumbria',
    type:            'rss',
    sourceType:      'rss',
    url:             'https://www.vivoumbria.it/feed/',
    enabled:         true,
    defaultLocation: 'Umbria, Italia',
  },

  // ── Comune di Foligno — notizie/eventi ───────────────────────────────────────
  {
    name:            'comune-foligno',
    type:            'rss',
    sourceType:      'rss',
    url:             'https://www.comune.foligno.pg.it/notizie/feed',
    enabled:         true,
    defaultLocation: 'Foligno, PG',
  },

  // ── Eventbrite — region Umbria (richiede EVENTBRITE_API_KEY in .env) ─────────
  // Per abilitare: ottieni il token su https://www.eventbrite.com/platform/
  // e aggiungi EVENTBRITE_API_KEY=<token> nel file backend/.env
  {
    name:       'eventbrite-umbria',
    type:       'eventbrite',
    sourceType: 'eventbrite',
    url:        'https://www.eventbriteapi.com/v3/events/search/',
    enabled:    !!process.env.EVENTBRITE_API_KEY,
    defaultLocation: 'Umbria, Italia',
    params: {
      'location.address':         'Foligno, Umbria, Italia',
      'location.within':          '50km',
      'start_date.range_start':   new Date().toISOString(),
    },
  },
];

module.exports = { AGGREGATOR_SOURCES };
