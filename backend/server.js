require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const { initializeDatabase } = require('./db/database');
const { runMigrations }      = require('./db/migrations');
const { seedDatabase }       = require('./db/seed');
const errorHandler           = require('./middleware/errorHandler');

const eventsRouter     = require('./routes/events');
const feedRouter       = require('./routes/feed');
const uploadRouter     = require('./routes/upload');
const debugRouter      = require('./routes/debug');
const profileRouter    = require('./routes/profile');
const socialRouter     = require('./routes/social');
const aggregatorRouter  = require('./routes/aggregator');
const organizersRouter  = require('./routes/organizers');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialise Firebase Admin SDK
initializeDatabase();
runMigrations();
seedDatabase();

// Routes — montati sia su /api/* (Vercel) che su /* (locale)
function mountRoutes(router) {
  router.use('/events',     eventsRouter);
  router.use('/feed',       feedRouter);
  router.use('/upload',     uploadRouter);
  router.use('/profile',    profileRouter);
  router.use('/social',     socialRouter);
  router.use('/aggregator',  aggregatorRouter);
  router.use('/organizers',  organizersRouter);
  router.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

  if (process.env.NODE_ENV !== 'production') {
    router.use('/debug', debugRouter);
  }
}

mountRoutes(app);

const apiRouter = express.Router();
mountRoutes(apiRouter);
app.use('/api', apiRouter);

app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`\n🎉 Moody backend running on http://localhost:${PORT}\n`);
});

function shutdown(signal) {
  console.log(`\n[${signal}] Shutting down gracefully…`);
  server.close(() => {
    console.log('✅ Server closed. Bye.');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

module.exports = app;
