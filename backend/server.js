require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { initializeDatabase } = require('./db/database');
const { runMigrations } = require('./db/migrations');
const { seedDatabase } = require('./db/seed');
const errorHandler = require('./middleware/errorHandler');

const eventsRouter  = require('./routes/events');
const feedRouter    = require('./routes/feed');
const uploadRouter  = require('./routes/upload');
const debugRouter   = require('./routes/debug');
const profileRouter = require('./routes/profile');
const socialRouter  = require('./routes/social');

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsDir));

// Initialize DB — must run before any request handler imports repositories
const db = initializeDatabase();
runMigrations(db);
seedDatabase(db);

// Routes
app.use('/events',  eventsRouter);
app.use('/feed',    feedRouter);
app.use('/upload',  uploadRouter);
app.use('/profile', profileRouter);
app.use('/social',  socialRouter);

if (process.env.NODE_ENV !== 'production') {
  app.use('/debug', debugRouter);
}
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`\n🎉 Moody backend running on http://localhost:${PORT}\n`);
});

// ── Graceful shutdown ────────────────────────────────────────────────────────
// Ensures SQLite WAL is flushed and in-flight requests finish before exit.
function shutdown(signal) {
  console.log(`\n[${signal}] Shutting down gracefully…`);
  server.close(() => {
    try { db.close(); } catch (_) {}
    console.log('✅ Closed DB connection. Bye.');
    process.exit(0);
  });

  // Force exit if still open after 5 s
  setTimeout(() => process.exit(1), 5_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

module.exports = app;
