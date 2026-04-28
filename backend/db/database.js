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

function getDatabase() {
  if (!db) return initializeDatabase();
  return db;
}

module.exports = { initializeDatabase, getDatabase };
