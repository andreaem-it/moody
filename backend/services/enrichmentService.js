/**
 * AI Enrichment Service
 * Currently uses keyword-rule-based mock.
 * Replace enrichEvent() body with an OpenAI/Gemini call to go production.
 */

const VIBE_RULES = [
  { keywords: ['dj', 'club', 'dance', 'techno', 'house', 'rave'], vibes: ['nightlife', 'energetic'] },
  { keywords: ['live', 'concert', 'concerto', 'band', 'rock', 'jazz', 'karaoke'], vibes: ['music', 'social'] },
  { keywords: ['book', 'libro', 'author', 'autore', 'museum', 'museo', 'theatre', 'teatro', 'mostra', 'galleria'], vibes: ['cultural'] },
  { keywords: ['wine', 'vino', 'aperitivo', 'dinner', 'cena', 'food', 'cucina', 'chef', 'pasta', 'tasting', 'degustazione', 'street food', 'mercato'], vibes: ['food', 'social'] },
  { keywords: ['workshop', 'experience', 'tour', 'yoga', 'sport', 'escursione'], vibes: ['experience'] },
  { keywords: ['rooftop', 'terrazza', 'aperitivo', 'bar', 'spritz', 'cocktail'], vibes: ['social', 'chill'] },
  { keywords: ['parco', 'park', 'outdoor', 'open air', 'aperto', 'natura'], vibes: ['chill'] },
];

const ENERGY_RULES = [
  { keywords: ['techno', 'rave', 'club', 'dance', 'rock'], score: 0.9 },
  { keywords: ['karaoke', 'party', 'festival', 'street food'], score: 0.7 },
  { keywords: ['jazz', 'live', 'concert', 'concerto'], score: 0.55 },
  { keywords: ['aperitivo', 'rooftop', 'wine', 'vino'], score: 0.4 },
  { keywords: ['yoga', 'book', 'mostra', 'museum', 'galleria'], score: 0.2 },
];

const SOCIAL_RULES = [
  { keywords: ['festival', 'street food', 'mercato', 'karaoke', 'party'], score: 0.9 },
  { keywords: ['aperitivo', 'rooftop', 'bar', 'cocktail'], score: 0.8 },
  { keywords: ['live', 'concert', 'jazz', 'rock'], score: 0.65 },
  { keywords: ['yoga', 'workshop', 'experience'], score: 0.5 },
  { keywords: ['book', 'mostra', 'museum', 'theatre'], score: 0.3 },
];

function matchKeywords(text, rules) {
  const lower = text.toLowerCase();
  for (const rule of rules) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return rule;
    }
  }
  return null;
}

function dedupeArray(arr) {
  return [...new Set(arr)];
}

/**
 * Enriches a parsed event with vibes, energyScore, and socialScore.
 * @param {{ title: string, description: string, rawText: string }} parsed
 * @returns {{ vibes: string[], energyScore: number, socialScore: number }}
 */
function enrichEvent(parsed) {
  const corpus = `${parsed.title} ${parsed.description} ${parsed.rawText || ''}`;

  const vibes = [];
  for (const rule of VIBE_RULES) {
    if (rule.keywords.some((kw) => corpus.toLowerCase().includes(kw))) {
      vibes.push(...rule.vibes);
    }
  }

  const energyRule = matchKeywords(corpus, ENERGY_RULES);
  const socialRule = matchKeywords(corpus, SOCIAL_RULES);

  const energyScore = energyRule ? energyRule.score : 0.5;
  const socialScore = socialRule ? socialRule.score : 0.5;

  return {
    vibes: dedupeArray(vibes.length ? vibes : ['social']),
    energyScore,
    socialScore,
  };
}

module.exports = { enrichEvent };
