const Database = require('better-sqlite3');
const path = require('path');

let db;

function initializeDatabase() {
  if (db) return db;

  const dbPath = path.join(__dirname, '..', 'moody.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  return db;
}

/** Primary accessor used by repositories — always returns initialised instance. */
function getDb() {
  if (!db) return initializeDatabase();
  return db;
}

/** Wraps a function inside a better-sqlite3 transaction. */
function transaction(fn) {
  return getDb().transaction(fn);
}

// getDatabase kept for backward compatibility
module.exports = { initializeDatabase, getDatabase: getDb, getDb, transaction };
