/**
 * activityController
 * Returns events the user has interacted with (liked, checked-in, mood vote).
 * Used by the "Vai" tab to show the user's personal event list.
 */

const { getDb } = require('../db/database');
const eventRepository = require('../repositories/eventRepository');
const checkinRepository = require('../repositories/checkinRepository');
const moodRepository = require('../repositories/moodRepository');

async function getUserActivity(req, res, next) {
  try {
    const { userId } = req.params;

    // Events liked
    const likedRows = getDb()
      .prepare(`SELECT DISTINCT eventId FROM feedback WHERE userId = ? AND type = 'like' ORDER BY createdAt DESC`)
      .all(userId);

    // Events checked-in
    const checkinRows = getDb()
      .prepare(`SELECT DISTINCT eventId, createdAt FROM checkins WHERE userId = ? ORDER BY createdAt DESC`)
      .all(userId);

    // Merge unique event IDs preserving order
    const checkinIds = new Set(checkinRows.map((r) => r.eventId));
    const likedIds   = new Set(likedRows.map((r) => r.eventId));
    const allIds     = [...new Set([...checkinIds, ...likedIds])];

    const events = allIds
      .map((id) => eventRepository.findById(id))
      .filter(Boolean)
      .map((event) => ({
        ...event,
        isCheckedIn: checkinIds.has(event.id),
        isLiked:     likedIds.has(event.id),
        peopleCount: checkinRepository.countByEvent(event.id),
        ...moodRepository.getBreakdown(event.id),
      }));

    // Stats summary
    const moodVoteCount = getDb()
      .prepare(`SELECT COUNT(*) as c FROM moods WHERE userId = ?`)
      .get(userId).c;

    res.json({
      events,
      stats: {
        likedCount:    likedIds.size,
        checkinCount:  checkinIds.size,
        moodVoteCount,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getUserActivity };
