/**
 * checkinController
 * Handles event check-ins with duplicate prevention.
 * All DB access is delegated to repositories.
 */

const { updateProfileFromCheckin } = require('../services/profileService');
const checkinRepository = require('../repositories/checkinRepository');
const eventRepository = require('../repositories/eventRepository');

async function postCheckin(req, res, next) {
  try {
    const { id: eventId } = req.params;
    const { userId = 'demo-user' } = req.body;

    const event = eventRepository.findById(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    if (checkinRepository.existsByEventAndUser(eventId, userId)) {
      return res.status(409).json({
        error: 'Already checked in to this event',
        alreadyCheckedIn: true,
        peopleCount: checkinRepository.countByEvent(eventId),
      });
    }

    checkinRepository.create(eventId, userId);

    // Very strong positive profile signal — event.vibes is already a parsed array
    updateProfileFromCheckin(userId, event);

    const peopleCount = checkinRepository.countByEvent(eventId);
    res.status(201).json({ success: true, peopleCount, userId, eventId });
  } catch (err) {
    next(err);
  }
}

async function getCheckins(req, res, next) {
  try {
    const { id: eventId } = req.params;

    const event = eventRepository.findById(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    res.json({ eventId, peopleCount: checkinRepository.countByEvent(eventId) });
  } catch (err) {
    next(err);
  }
}

module.exports = { postCheckin, getCheckins };
