/**
 * Ranking Service
 * Scores and sorts events for a given user profile and context.
 *
 * Score formula:
 *   baseScore = Σ(factor × weight)          — weights sum to 1.0
 *   finalScore = (baseScore + trending×0.15) × timeDecay
 */

const WEIGHTS = {
  vibeMatch:       0.30,
  timeScore:       0.25,
  distanceScore:   0.15,
  budgetScore:     0.10,
  popularityScore: 0.10,
  explorationScore:0.10,
};

const BUDGET_LIMITS = { low: 8, medium: 20, high: 50 };

// ─── Ranking log (debug) ─────────────────────────────────────────────────────

const rankingLogs = [];
const MAX_LOG_SIZE = 100;

function addLog(entry) {
  rankingLogs.push(entry);
  if (rankingLogs.length > MAX_LOG_SIZE) rankingLogs.shift();
}

function getRankingLogs() {
  return [...rankingLogs];
}

// ─── Haversine ───────────────────────────────────────────────────────────────

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
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
  // weekend
  if (hoursUntil >= 0 && hoursUntil <= 48) return 0.9;
  return 0.5;
}

function calcDistanceScore(event, userLat, userLng, maxDistanceKm) {
  if (!event.latitude || !event.longitude) return 0.6;
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

function calcPopularityScore(peopleCount, popularityBoost) {
  const total = (peopleCount || 0) + (popularityBoost || 0);
  return Math.min(total / 30, 1);
}

/**
 * Exponential time decay: events happening soon score higher.
 * hoursToEvent < 0 (past) → 0.3 (still show but penalised)
 */
function calcTimeDecay(event) {
  const eventDateTime = new Date(`${event.date}T${event.time}:00`);
  const hoursToEvent = (eventDateTime - new Date()) / (1000 * 60 * 60);
  if (hoursToEvent < 0) return 0.3;
  return Math.exp(-hoursToEvent / 24);
}

// ─── Recommendation reason ───────────────────────────────────────────────────

function generateReason(scores, contextMode) {
  if (contextMode === 'last-minute') return 'Evento last minute vicino a te';

  const candidates = [
    { score: scores.vibeMatch,       text: 'In linea con i tuoi gusti' },
    { score: scores.popularityScore, text: 'Sta diventando popolare' },
    { score: scores.distanceScore,   text: 'A due passi da te' },
    { score: scores.budgetScore,     text: 'Perfetto per il tuo budget' },
    { score: scores.trendingScore,   text: 'Trending in questo momento' },
  ];

  const best = candidates.reduce((a, b) => (a.score >= b.score ? a : b));
  return best.score < 0.35 ? 'Potrebbe sorprenderti' : best.text;
}

// ─── Main ranking ─────────────────────────────────────────────────────────────

/**
 * @param {object[]} events         Enriched events (must include trendingScore, momentumCount, popularityBoost)
 * @param {object}   profile        User profile from DB
 * @param {string}   contextMode    'tonight' | 'weekend' | 'last-minute'
 * @param {number}   userLat
 * @param {number}   userLng
 * @returns {object[]} Top 3–10 events, sorted by finalScore desc.
 */
function rankEvents(events, profile, contextMode, userLat, userLng) {
  // preferredVibes may already be a parsed array (from profileRepository) or a JSON string
  const preferredVibes = Array.isArray(profile.preferredVibes)
    ? profile.preferredVibes
    : JSON.parse(profile.preferredVibes || '[]');

  const scored = events.map((event) => {
    const eventVibes = Array.isArray(event.vibes) ? event.vibes : JSON.parse(event.vibes || '[]');
    const trendingScore = event.trendingScore ?? 0;
    const timeDecay = calcTimeDecay(event);

    const scores = {
      vibeMatch:       calcVibeMatch(eventVibes, preferredVibes),
      timeScore:       calcTimeScore(event, contextMode),
      distanceScore:   calcDistanceScore(event, userLat, userLng, profile.maxDistanceKm),
      budgetScore:     calcBudgetScore(event.price, profile.budgetLevel),
      popularityScore: calcPopularityScore(event.peopleCount, event.popularityBoost),
      explorationScore: Math.random(),
      trendingScore,
    };

    const baseScore =
      scores.vibeMatch        * WEIGHTS.vibeMatch +
      scores.timeScore        * WEIGHTS.timeScore +
      scores.distanceScore    * WEIGHTS.distanceScore +
      scores.budgetScore      * WEIGHTS.budgetScore +
      scores.popularityScore  * WEIGHTS.popularityScore +
      scores.explorationScore * WEIGHTS.explorationScore * profile.explorationRate;

    const finalScore = (baseScore + trendingScore * 0.15) * timeDecay;

    // Debug log
    addLog({
      eventId: event.id,
      eventTitle: event.title,
      finalScore: Math.round(finalScore * 1000) / 1000,
      timestamp: new Date().toISOString(),
      breakdown: { ...scores, timeDecay, contextMode },
    });

    return {
      ...event,
      vibes: eventVibes,
      score: Math.round(finalScore * 100) / 100,
      recommendationReason: generateReason(scores, contextMode),
    };
  });

  const sorted = scored.sort((a, b) => b.score - a.score);
  return sorted.slice(0, Math.max(3, Math.min(sorted.length, 10)));
}

module.exports = { rankEvents, getRankingLogs };
