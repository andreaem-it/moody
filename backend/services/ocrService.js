/**
 * OCR Service
 * Currently uses a mock implementation.
 * To integrate Google Cloud Vision: replace extractTextFromImage with a real API call.
 *
 * Example production integration:
 *   const vision = require('@google-cloud/vision');
 *   const client = new vision.ImageAnnotatorClient();
 *   const [result] = await client.textDetection(filePath);
 *   return result.textAnnotations[0]?.description || '';
 */

const MOCK_TEXTS = [
  `APERITIVO IN DARSENA\nVenerdì 2 Maggio 2026 • ore 19:00\nDarsena, Milano\nIngresso libero • Cibo e drink da €8`,
  `LIVE JAZZ NIGHT\nSabato 3 Maggio 2026 • ore 21:30\nBlue Note Milano, Via Borsieri 37\nIngresso €20 • Prenotazione consigliata`,
  `WORKSHOP PASTA FRESCA\nSabato 3 Maggio • ore 17:00\nCucina Collettiva, Porta Venezia\n€45 a persona • include cena\nPosti limitati, prenota subito!`,
  `DJ SET OPEN AIR\nDomenica 3 Maggio • dalle 22:00\nCircolo Magnolia, Segrate\nIngresso €10 • Bar aperto fino all'alba`,
  `STREET FOOD FESTIVAL\nDomenica 4 Maggio • dalle 12:00\nBASE Milano, Via Bergognone 34\nIngresso gratuito • 30+ stand internazionali`,
  `CONCERTO ROCK\nStasera • ore 22:30\nTunnel Club, Via Sammartini 30\nBiglietti €18 • Posti limitati`,
  `MOSTRA FOTOGRAFICA\nDal 1 al 10 Maggio 2026\nGalleria Brera, Via Brera 28\nIngresso €8 • Gratuito sabato mattina`,
];

/**
 * Extracts raw text from an image file (mock implementation).
 * @param {string} filePath - Absolute path to the uploaded image.
 * @returns {Promise<string>} Raw extracted text.
 */
async function extractTextFromImage(filePath) {
  // Simulate processing delay
  await new Promise((resolve) => setTimeout(resolve, 600));

  // In production: send filePath to Google Vision or AWS Textract
  const index = Math.floor(Math.random() * MOCK_TEXTS.length);
  return MOCK_TEXTS[index];
}

/**
 * Computes a mock confidence score (0–1) based on how many key fields were extracted.
 * In production this would come from the Vision API's confidence annotations.
 */
function calculateConfidence(parsed) {
  const checks = [
    parsed.title && parsed.title !== 'Evento senza titolo',
    parsed.date && parsed.date !== new Date().toISOString().split('T')[0],
    parsed.time && parsed.time !== '20:00',
    parsed.location && parsed.location !== 'Milano',
    parsed.price !== null && parsed.price !== undefined,
  ];
  const ratio = checks.filter(Boolean).length / checks.length;
  if (ratio >= 0.8) return parseFloat((0.85 + Math.random() * 0.10).toFixed(2));
  if (ratio >= 0.5) return parseFloat((0.55 + Math.random() * 0.15).toFixed(2));
  return parseFloat((0.40 + Math.random() * 0.10).toFixed(2));
}

/**
 * Parses raw OCR text into structured event fields.
 * @param {string} rawText
 * @returns {{ title, description, date, time, location, price, confidence }}
 */
function parseEventFromText(rawText) {
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);

  const title = lines[0] || 'Evento senza titolo';
  const description = lines.slice(1, 3).join(' ');

  // Date: look for patterns like "2 Maggio 2026" or "Stasera"
  const dateMatch = rawText.match(/(\d{1,2}\s+\w+\s+\d{4})/i);
  const date = dateMatch ? normalizeDateString(dateMatch[1]) : new Date().toISOString().split('T')[0];

  // Time: look for "ore 21:30" or "dalle 22:00"
  const timeMatch = rawText.match(/(?:ore|dalle)\s+(\d{2}:\d{2})/i);
  const time = timeMatch ? timeMatch[1] : '20:00';

  // Location: second line often contains it
  const locationLine = lines.find((l) => l.match(/Via|Piazza|Parco|Milano|Club|Galleria/i));
  const location = locationLine || lines[1] || 'Milano';

  // Price: look for €N or "gratuito" / "libero"
  const priceMatch = rawText.match(/€\s*(\d+(?:[.,]\d+)?)/i);
  const freeMatch = rawText.match(/gratuito|libero|free/i);
  const price = freeMatch ? 0 : priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : null;

  const parsed = { title, description, date, time, location, price };
  return { ...parsed, confidence: calculateConfidence(parsed) };
}

function normalizeDateString(str) {
  const months = {
    gennaio: '01', febbraio: '02', marzo: '03', aprile: '04',
    maggio: '05', giugno: '06', luglio: '07', agosto: '08',
    settembre: '09', ottobre: '10', novembre: '11', dicembre: '12',
  };

  const match = str.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/i);
  if (!match) return new Date().toISOString().split('T')[0];

  const day = match[1].padStart(2, '0');
  const month = months[match[2].toLowerCase()] || '01';
  const year = match[3];
  return `${year}-${month}-${day}`;
}

module.exports = { extractTextFromImage, parseEventFromText };
