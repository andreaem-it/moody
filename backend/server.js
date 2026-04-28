require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { initializeDatabase } = require('./db/database');
const { runMigrations } = require('./db/migrations');
const { seedDatabase } = require('./db/seed');
const errorHandler = require('./middleware/errorHandler');

const eventsRouter = require('./routes/events');
const feedRouter = require('./routes/feed');
const uploadRouter = require('./routes/upload');

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsDir));

// Initialize DB
const db = initializeDatabase();
runMigrations(db);
seedDatabase(db);

// Attach db instance to every request
app.use((req, _res, next) => {
  req.db = db;
  next();
});

// Routes
app.use('/events', eventsRouter);
app.use('/feed', feedRouter);
app.use('/upload', uploadRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`\n🎉 Moody backend running on http://localhost:${PORT}\n`);
});

module.exports = app;
