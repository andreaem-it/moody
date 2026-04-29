const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { extractTextFromImage, parseEventFromText } = require('../services/ocrService');
const { enrichEvent } = require('../services/enrichmentService');

// ─── Multer config ───────────────────────────────────────────────────────────

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are accepted'));
  },
});

// ─── Controller ──────────────────────────────────────────────────────────────

async function uploadAndProcess(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const rawText = await extractTextFromImage(req.file.path);
    const parsed = parseEventFromText(rawText);
    const enriched = enrichEvent({ ...parsed, rawText });

    // Clean up temp file (non-blocking)
    fs.unlink(req.file.path, () => {});

    res.json({
      title:       parsed.title,
      description: parsed.description,
      date:        parsed.date,
      time:        parsed.time,
      location:    parsed.location,
      price:       parsed.price,
      vibes:       enriched.vibes,
      energyScore: enriched.energyScore,
      socialScore: enriched.socialScore,
      sourceType:  'ocr',
      rawText,
      confidence:  parsed.confidence,   // 0–1 mock OCR confidence score
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { upload, uploadAndProcess };
