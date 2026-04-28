function runMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      location TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      price REAL,
      vibes TEXT NOT NULL DEFAULT '[]',
      energyScore REAL DEFAULT 0.5,
      socialScore REAL DEFAULT 0.5,
      sourceType TEXT DEFAULT 'manual',
      rawText TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS checkins (
      id TEXT PRIMARY KEY,
      eventId TEXT NOT NULL,
      userId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS moods (
      id TEXT PRIMARY KEY,
      eventId TEXT NOT NULL,
      userId TEXT NOT NULL,
      value TEXT NOT NULL CHECK(value IN ('fire', 'mid', 'dead')),
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      UNIQUE(eventId, userId),
      FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY,
      eventId TEXT NOT NULL,
      userId TEXT NOT NULL,
      type TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_profiles (
      id TEXT PRIMARY KEY,
      userId TEXT UNIQUE NOT NULL,
      preferredVibes TEXT DEFAULT '[]',
      maxDistanceKm REAL DEFAULT 20,
      budgetLevel TEXT DEFAULT 'medium',
      energyPreference REAL DEFAULT 0.5,
      socialPreference REAL DEFAULT 0.5,
      explorationRate REAL DEFAULT 0.3,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);

  console.log('✅ Migrations complete');
}

module.exports = { runMigrations };
