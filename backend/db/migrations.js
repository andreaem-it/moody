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

  // Idempotent column additions (SQLite ALTER TABLE is limited – use try/catch)
  for (const stmt of [
    'ALTER TABLE events ADD COLUMN eventHash TEXT',
    'ALTER TABLE events ADD COLUMN popularityBoost INTEGER DEFAULT 0',
    'ALTER TABLE user_profiles ADD COLUMN displayName TEXT',
    'ALTER TABLE user_profiles ADD COLUMN avatarUrl TEXT',
  ]) {
    try { db.exec(stmt); } catch (_) { /* column already exists */ }
  }

  // ── Indexes (all idempotent via IF NOT EXISTS) ──────────────────────────────
  db.exec(`
    -- Feed context queries
    CREATE INDEX IF NOT EXISTS idx_events_date        ON events(date);
    CREATE INDEX IF NOT EXISTS idx_events_hash        ON events(eventHash);

    -- Live data queries (people count, trending)
    CREATE INDEX IF NOT EXISTS idx_checkins_event     ON checkins(eventId);
    CREATE INDEX IF NOT EXISTS idx_checkins_event_ts  ON checkins(eventId, createdAt);
    CREATE INDEX IF NOT EXISTS idx_checkins_event_user ON checkins(eventId, userId);

    -- Mood breakdown + trending
    CREATE INDEX IF NOT EXISTS idx_moods_event        ON moods(eventId);
    CREATE INDEX IF NOT EXISTS idx_moods_event_user   ON moods(eventId, userId);
    CREATE INDEX IF NOT EXISTS idx_moods_event_ts     ON moods(eventId, updatedAt);

    -- Skip pattern (JOIN feedback + events)
    CREATE INDEX IF NOT EXISTS idx_feedback_user_type ON feedback(userId, type);
    CREATE INDEX IF NOT EXISTS idx_feedback_event     ON feedback(eventId);
  `);

  // ── Social tables ────────────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS follows (
      id          TEXT PRIMARY KEY,
      followerId  TEXT NOT NULL,
      followingId TEXT NOT NULL,
      createdAt   TEXT NOT NULL,
      UNIQUE(followerId, followingId)
    );

    CREATE TABLE IF NOT EXISTS posts (
      id          TEXT PRIMARY KEY,
      userId      TEXT NOT NULL,
      eventId     TEXT,
      mediaUrl    TEXT,
      mediaType   TEXT DEFAULT 'photo' CHECK(mediaType IN ('photo', 'video')),
      caption     TEXT,
      createdAt   TEXT NOT NULL,
      FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_follows_follower   ON follows(followerId);
    CREATE INDEX IF NOT EXISTS idx_follows_following  ON follows(followingId);
    CREATE INDEX IF NOT EXISTS idx_posts_user         ON posts(userId);
    CREATE INDEX IF NOT EXISTS idx_posts_event        ON posts(eventId);
    CREATE INDEX IF NOT EXISTS idx_posts_created      ON posts(createdAt);
  `);

  console.log('✅ Migrations complete');
}

module.exports = { runMigrations };
