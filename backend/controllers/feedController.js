/**
 * feedController
 * Builds the ranked, personalised event feed.
 * All DB access is delegated to repositories.
 */

const { rankEvents } = require('../services/rankingService');
const profileRepository = require('../repositories/profileRepository');
const eventRepository = require('../repositories/eventRepository');
const checkinRepository = require('../repositories/checkinRepository');
const moodRepository = require('../repositories/moodRepository');
const feedCache = require('../services/feedCache');

const DEFAULT_LAT = 45.4642; // Milan
const DEFAULT_LNG = 9.1900;

// ─── Live-data enrichment ─────────────────────────────────────────────────────

/**
 * Attaches real-time stats (people count, mood breakdown, trending score)
 * to an already-parsed event object.
 */
function enrichWithLiveData(event) {
  const peopleCount   = checkinRepository.countByEvent(event.id);
  const momentumCount = checkinRepository.countRecent(event.id, 120); // 2 h window
  const moodVotes120  = moodRepository.countRecent(event.id, 120);
  const moodData      = moodRepository.getBreakdown(event.id);

  // Trending: checkins in 2h + mood votes in 2h (×2 weight), normalised 0–1
  const trendingRaw   = momentumCount + moodVotes120 * 2;
  const trendingScore = Math.min(trendingRaw / 20, 1);

  return {
    ...event,
    peopleCount,
    momentumCount,
    trendingScore,
    ...moodData,
  };
}

// ─── Main feed handler ────────────────────────────────────────────────────────

async function getFeed(req, res, next) {
  try {
    const { context = 'tonight', lat, lng, userId = 'demo-user' } = req.query;

    // ── Cache hit ──
    const cached = feedCache.get(userId, context);
    if (cached) return res.json(cached);

    const profile = profileRepository.createIfNotExists(userId);
    const events  = eventRepository.findByContext(context).map(enrichWithLiveData);

    const userLat = lat ? parseFloat(lat) : DEFAULT_LAT;
    const userLng = lng ? parseFloat(lng) : DEFAULT_LNG;

    let ranked = rankEvents(events, profile, context, userLat, userLng);

    // ── Geo fallback: expand search radius if fewer than 3 results ──
    if (ranked.length < 3 && profile.maxDistanceKm < 100) {
      const widerProfile = { ...profile, maxDistanceKm: profile.maxDistanceKm * 1.5 };
      ranked = rankEvents(events, widerProfile, context, userLat, userLng);
    }

    // ── Surprise event: flag lowest-scored result ──
    if (ranked.length > 1) {
      ranked[ranked.length - 1] = {
        ...ranked[ranked.length - 1],
        recommendationReason: 'Potrebbe sorprenderti',
        isSurprise: true,
      };
    }

    const result = { context, events: ranked };
    feedCache.set(userId, context, result);

    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { getFeed };
