#!/usr/bin/env node
/**
 * scripts/run-aggregator.js
 *
 * Script CLI per eseguire manualmente l'aggregatore dall'host.
 *
 * Uso:
 *   node backend/scripts/run-aggregator.js
 *   node backend/scripts/run-aggregator.js --dry-run
 *   node backend/scripts/run-aggregator.js --sources umbria24-eventi,comune-foligno
 *
 * Richiede le variabili d'ambiente di Firebase (FIREBASE_PROJECT_ID, ecc.)
 * già impostate nel file backend/.env
 */

'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { initializeDatabase } = require('../db/database');
const { runAggregation }     = require('../services/aggregator/index');

const args = process.argv.slice(2);

const dryRun = args.includes('--dry-run');

const sourcesIdx = args.indexOf('--sources');
const onlySources = sourcesIdx >= 0 && args[sourcesIdx + 1]
  ? args[sourcesIdx + 1].split(',').map((s) => s.trim())
  : null;

(async () => {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║    Moody Event Aggregator — CLI Run       ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`  dryRun:      ${dryRun}`);
  console.log(`  onlySources: ${onlySources ? onlySources.join(', ') : 'tutte'}`);
  console.log('');

  try {
    initializeDatabase();

    const report = await runAggregation({ dryRun, onlySources });

    console.log('\n══ REPORT FINALE ══');
    console.log(`  Durata:     ${report.durationMs}ms`);
    console.log(`  Salvati:    ${report.totals.saved}`);
    console.log(`  Duplicati:  ${report.totals.duplicate}`);
    console.log(`  Merged:     ${report.totals.merged}`);
    console.log(`  Saltati:    ${report.totals.skipped}`);
    console.log(`  Errori:     ${report.totals.errors}`);
    console.log('');

    for (const src of report.sources) {
      console.log(`  [${src.name}] saved=${src.saved} dup=${src.duplicate} err=${src.errors}`);
      if (src.errorDetails.length > 0) {
        for (const e of src.errorDetails) {
          console.error(`    → ${e.phase}: ${e.error}`);
        }
      }
    }

    process.exit(0);
  } catch (err) {
    console.error('\n✗ Aggregazione fallita:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();
