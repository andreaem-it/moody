/**
 * prune-expired-events.js
 *
 * Elimina dalla collezione Firestore `events` i documenti con date < oggi (YYYY-MM-DD, UTC).
 * Eseguito a batch da 450 documenti alla volta fino ad esaurimento.
 *
 * Uso: node backend/scripts/prune-expired-events.js
 * npm run prune-events — dalla cartella backend
 */

'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const admin = require('firebase-admin');

const { initializeDatabase } = require('../db/database');

initializeDatabase();

const db = admin.firestore();
const TODAY = new Date().toISOString().split('T')[0];

async function run() {
  console.log(`[prune-expired-events] Eliminazione eventi con date < ${TODAY}…`);
  let deleted = 0;
  // Richiede indice composito: date ascendente su events con filtro <
  // (Firebase suggerisce il link nell'errore se manca alla prima esecuzione)
  while (true) {
    const snap = await db
      .collection('events')
      .where('date', '<', TODAY)
      .orderBy('date', 'asc')
      .limit(450)
      .get();
    if (snap.empty) break;
    const batch = db.batch();
    for (const d of snap.docs) batch.delete(d.ref);
    await batch.commit();
    deleted += snap.size;
    if (snap.size < 450) break;
  }
  console.log(`[prune-expired-events] ✅ Eliminati ${deleted} documenti.`);
}

run().catch((err) => {
  console.error('[prune-expired-events]', err);
  process.exit(1);
});
