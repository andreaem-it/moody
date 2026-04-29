/**
 * feedController
 * Builds the ranked, personalised event feed.
 */

const { rankEvents }    = require('../services/rankingService');
const profileRepository = require('../repositories/profileRepository');
const eventRepository   = require('../repositories/eventRepository');
const checkinRepository = require('../repositories/checkinRepository');
const moodRepository    = require('../repositories/moodRepository');
const feedCache         = require('../services/feedCache');

const DEFAULT_LAT = 45.4642; // Milan
const DEFAULT_LNG = 9.1900;

async function enrichWithLiveData(event) {
  const [peopleCount, momentumCount, moodVotes120, moodData] = await Promise.all([
    checkinRepository.countByEvent(event.id),
    checkinRepository.countRecent(event.id, 120),
    moodRepository.countRecent(event.id, 120),
    moodRepository.getBreakdown(event.id),
  ]);

  const trendingRaw   = momentumCount + moodVotes120 * 2;
  const trendingScore = Math.min(trendingRaw / 20, 1);

  return { ...event, peopleCount, momentumCount, trendingScore, ...moodData };
}

async function getFeed(req, res, next) {
  try {
    const { context = 'tonight', lat, lng, userId = 'demo-user' } = req.query;

    const cached = feedCache.get(userId, context);
    if (cached) return res.json(cached);

    const [profile, rawEvents] = await Promise.all([
      profileRepository.createIfNotExists(userId),
      eventRepository.findByContext(context),
    ]);

    const events = await Promise.all(rawEvents.map(enrichWithLiveData));

    const userLat = lat ? parseFloat(lat) : DEFAULT_LAT;
    const userLng = lng ? parseFloat(lng) : DEFAULT_LNG;

    let ranked = rankEvents(events, profile, context, userLat, userLng);

    if (ranked.length < 3 && profile.maxDistanceKm < 100) {
      const widerProfile = { ...profile, maxDistanceKm: profile.maxDistanceKm * 1.5 };
      ranked = rankEvents(events, widerProfile, context, userLat, userLng);
    }

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
