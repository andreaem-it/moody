/**
 * activityController
 * Returns events the user has interacted with (liked, checked-in, mood vote).
 * Used by the "Vai" tab.
 */

const { getDb }         = require('../db/database');
const eventRepository   = require('../repositories/eventRepository');
const checkinRepository = require('../repositories/checkinRepository');
const moodRepository    = require('../repositories/moodRepository');

async function getUserActivity(req, res, next) {
  try {
    const { userId } = req.params;
    const db         = getDb();

    const [likedSnap, checkinSnap, moodSnap] = await Promise.all([
      db.collection('feedback')
        .where('userId', '==', userId)
        .where('type',   '==', 'like')
        .get(),
      db.collection('checkins')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get(),
      db.collection('moods')
        .where('userId', '==', userId)
        .get(),
    ]);

    const checkinIds = new Set(checkinSnap.docs.map((d) => d.data().eventId));
    const likedIds   = new Set(likedSnap.docs.map((d) => d.data().eventId));
    const allIds     = [...new Set([...checkinIds, ...likedIds])];

    const events = (
      await Promise.all(allIds.map((id) => eventRepository.findById(id)))
    ).filter(Boolean);

    const enriched = await Promise.all(
      events.map(async (event) => ({
        ...event,
        isCheckedIn: checkinIds.has(event.id),
        isLiked:     likedIds.has(event.id),
        peopleCount: await checkinRepository.countByEvent(event.id),
        ...await moodRepository.getBreakdown(event.id),
      })),
    );

    res.json({
      events: enriched,
      stats: {
        likedCount:    likedIds.size,
        checkinCount:  checkinIds.size,
        moodVoteCount: moodSnap.size,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getUserActivity };
