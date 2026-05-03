/**
 * routes/aggregator.js
 *
 * Endpoint per trigger manuale dell'aggregatore.
 *
 * POST /aggregator/run
 *   Header:  x-admin-key: <ADMIN_API_KEY>
 *   Body:    { dryRun?: boolean, onlySources?: string[] }
 *
 * Risponde immediatamente con 202 e poi aggiorna il report quando completa.
 * Per run lunghe (molti feed + geocoding) esegue in background.
 */

'use strict';

const express              = require('express');
const { runAggregation }   = require('../services/aggregator/index');

const router = express.Router();

function requireAdminKey(req, res, next) {
  const expected = process.env.ADMIN_API_KEY;
  if (!expected) {
    return res.status(503).json({ error: 'ADMIN_API_KEY non configurata sul server.' });
  }
  const provided = req.headers['x-admin-key'];
  if (provided !== expected) {
    return res.status(401).json({ error: 'Chiave admin non valida.' });
  }
  next();
}

/**
 * POST /aggregator/run
 *
 * Avvia l'aggregazione in background e risponde subito.
 * Il report completo viene loggato nel server; per flussi avanzati
 * si può salvare il risultato su Firestore o notificarlo via webhook.
 */
router.post('/run', requireAdminKey, (req, res) => {
  const dryRun      = req.body.dryRun      === true;
  const onlySources = Array.isArray(req.body.onlySources) ? req.body.onlySources : null;

  const runId = `run_${Date.now()}`;
  console.log(`[aggregator] Avvio run ${runId} — dryRun=${dryRun}`);

  // Risponde subito con 202 Accepted, poi esegue in background
  res.status(202).json({
    message:    'Aggregazione avviata in background.',
    runId,
    dryRun,
    onlySources,
  });

  // Background execution
  runAggregation({ dryRun, onlySources })
    .then((report) => {
      console.log(`[aggregator] Run ${runId} completata:`, JSON.stringify(report.totals));
    })
    .catch((err) => {
      console.error(`[aggregator] Run ${runId} fallita:`, err.message);
    });
});

/**
 * GET /aggregator/sources
 *
 * Restituisce l'elenco delle fonti configurate (solo nome, tipo, url, enabled).
 * Utile per debug e configurazione via UI admin.
 */
router.get('/sources', requireAdminKey, (_req, res) => {
  const { AGGREGATOR_SOURCES } = require('../config/aggregatorSources');
  res.json({
    sources: AGGREGATOR_SOURCES.map(({ name, type, url, enabled }) => ({
      name, type, url, enabled,
    })),
  });
});

module.exports = router;
