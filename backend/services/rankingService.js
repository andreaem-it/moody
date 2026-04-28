/**
 * Ranking Service
 * Scores and sorts events for a given user profile and context.
 * Weights are tunable — keep them readable, not over-engineered.
 */

const WEIGHTS = {
  vibeMatch: 0.30,
  timeScore: 0.25,
  distanceScore: 0.15,
  budgetScore: 0.10,
  popularityScore: 0.10,
  explorationScore: 0.10,
};

const BUDGET_LIMITS = { low: 8, medium: 20, high: 50 };

// ─── Haversine formula ───────────────────────────────────────────────────────

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Sub-scorers ─────────────────────────────────────────────────────────────

function calcVibeMatch(eventVibes, preferredVibes) {
  if (!preferredVibes.length || !eventVibes.length) return 0.5;
  const matches = eventVibes.filter((v) => preferredVibes.includes(v)).length;
  return matches / Math.max(eventVibes.length, preferredVibes.length);
}

function calcTimeScore(event, contextMode) {
  const now = new Date();
  const eventDateTime = new Date(`${event.date}T${event.time}:00`);
  const hoursUntil = (eventDateTime - now) / (1000 * 60 * 60);

  if (contextMode === 'last-minute') {
    // Peak between 0–4 hours
    if (hoursUntil >= 0 && hoursUntil <= 4) return 1.0;
    if (hoursUntil > 4 && hoursUntil <= 6) return 0.5;
    return 0.1;
  }

  if (contextMode === 'tonight') {
    if (hoursUntil >= 0 && hoursUntil <= 2) return 1.0;
    if (hoursUntil > 2 && hoursUntil <= 6) return 0.8;
    if (hoursUntil > 6 && hoursUntil <= 12) return 0.5;
    return 0.2;
  }

  // weekend — all events scored equally by proximity to start
  if (hoursUntil >= 0 && hoursUntil <= 48) return 0.9;
  return 0.5;
}

function calcDistanceScore(event, userLat, userLng, maxDistanceKm) {
  if (!event.latitude || !event.longitude) return 0.6; // unknown location
  const dist = haversine(userLat, userLng, event.latitude, event.longitude);
  if (dist <= maxDistanceKm * 0.3) return 1.0;
  if (dist <= maxDistanceKm * 0.6) return 0.75;
  if (dist <= maxDistanceKm) return 0.4;
  return 0.05;
}

function calcBudgetScore(price, budgetLevel) {
  if (price === null || price === undefined) return 0.7;
  if (price === 0) return 1.0;
  const limit = BUDGET_LIMITS[budgetLevel] || 20;
  if (price <= limit * 0.5) return 1.0;
  if (price <= limit) return 0.7;
  if (price <= limit * 1.5) return 0.35;
  return 0.1;
}

function calcPopularityScore(peopleCount) {
  return Math.min((peopleCount || 0) / 30, 1);
}

// ─── Recommendation reason ───────────────────────────────────────────────────

function generateReason(scores, contextMode) {
  if (contextMode === 'last-minute') return 'Evento last minute vicino a te';

  const { vibeMatch, distanceScore, budgetScore, popularityScore } = scores;

  const candidates = [
    { score: vibeMatch,       text: 'In linea con i tuoi gusti' },
    { score: popularityScore, text: 'Sta diventando popolare' },
    { score: distanceScore,   text: 'A due passi da te' },
    { score: budgetScore,     text: 'Perfetto per il tuo budget' },
  ];

  const best = candidates.reduce((a, b) => (a.score >= b.score ? a : b));

  if (best.score < 0.35) return 'Potrebbe sorprenderti';
  return best.text;
}

// ─── Main ranking function ───────────────────────────────────────────────────

/**
 * Scores and ranks events for a given user and context.
 * @param {object[]} events     - Enriched events with live data (peopleCount, etc.)
 * @param {object}   profile    - User profile from DB
 * @param {string}   contextMode - 'tonight' | 'weekend' | 'last-minute'
 * @param {number}   userLat
 * @param {number}   userLng
 * @returns {object[]} Top 3–10 events sorted by score, each with recommendationReason.
 */
function rankEvents(events, profile, contextMode, userLat, userLng) {
  const preferredVibes = JSON.parse(profile.preferredVibes || '[]');

  const scored = events.map((event) => {
    const eventVibes = Array.isArray(event.vibes) ? event.vibes : JSON.parse(event.vibes || '[]');

    const scores = {
      vibeMatch:       calcVibeMatch(eventVibes, preferredVibes),
      timeScore:       calcTimeScore(event, contextMode),
      distanceScore:   calcDistanceScore(event, userLat, userLng, profile.maxDistanceKm),
      budgetScore:     calcBudgetScore(event.price, profile.budgetLevel),
      popularityScore: calcPopularityScore(event.peopleCount),
      explorationScore: Math.random(),
    };

    const total =
      scores.vibeMatch       * WEIGHTS.vibeMatch +
      scores.timeScore       * WEIGHTS.timeScore +
      scores.distanceScore   * WEIGHTS.distanceScore +
      scores.budgetScore     * WEIGHTS.budgetScore +
      scores.popularityScore * WEIGHTS.popularityScore +
      scores.explorationScore * WEIGHTS.explorationScore * profile.explorationRate;

    return {
      ...event,
      vibes: eventVibes,
      score: Math.round(total * 100) / 100,
      recommendationReason: generateReason(scores, contextMode),
    };
  });

  const sorted = scored.sort((a, b) => b.score - a.score);
  const count = Math.max(3, Math.min(sorted.length, 10));
  return sorted.slice(0, count);
}

module.exports = { rankEvents };
