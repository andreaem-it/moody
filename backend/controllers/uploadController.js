/**
 * uploadController
 * Handles image upload for OCR-based event creation.
 * Uses multer memory storage — the buffer is passed directly to the OCR service.
 * The file is NOT persisted to Firebase Storage here (it's a temporary OCR scan).
 */

const multer = require('multer');
const { extractTextFromImage, parseEventFromText } = require('../services/ocrService');
const { enrichEvent } = require('../services/enrichmentService');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are accepted'));
  },
});

async function uploadAndProcess(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Pass null — the mock OCR doesn't use the path; replace with buffer path when real OCR is integrated
    const rawText = await extractTextFromImage(null);
    const parsed  = parseEventFromText(rawText);
    const enriched = enrichEvent({ ...parsed, rawText });

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
      confidence:  parsed.confidence,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { upload, uploadAndProcess };
