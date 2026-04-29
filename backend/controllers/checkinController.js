/**
 * checkinController
 * Handles event check-ins with duplicate prevention.
 */

const { updateProfileFromCheckin } = require('../services/profileService');
const checkinRepository            = require('../repositories/checkinRepository');
const eventRepository              = require('../repositories/eventRepository');

async function postCheckin(req, res, next) {
  try {
    const { id: eventId } = req.params;
    const { userId = 'demo-user' } = req.body;

    const event = await eventRepository.findById(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const alreadyCheckedIn = await checkinRepository.existsByEventAndUser(eventId, userId);
    if (alreadyCheckedIn) {
      return res.status(409).json({
        error: 'Already checked in to this event',
        alreadyCheckedIn: true,
        peopleCount: await checkinRepository.countByEvent(eventId),
      });
    }

    await checkinRepository.create(eventId, userId);
    await updateProfileFromCheckin(userId, event);

    const peopleCount = await checkinRepository.countByEvent(eventId);
    res.status(201).json({ success: true, peopleCount, userId, eventId });
  } catch (err) {
    next(err);
  }
}

async function getCheckins(req, res, next) {
  try {
    const { id: eventId } = req.params;
    const event = await eventRepository.findById(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json({ eventId, peopleCount: await checkinRepository.countByEvent(eventId) });
  } catch (err) {
    next(err);
  }
}

module.exports = { postCheckin, getCheckins };
