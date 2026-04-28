const express = require('express');
const { listEvents, getEvent, createEvent, deleteEvent } = require('../controllers/eventsController');
const { postFeedback } = require('../controllers/feedbackController');
const { postCheckin, getCheckins } = require('../controllers/checkinController');
const { postMood, getMood } = require('../controllers/moodController');

const router = express.Router();

// Events CRUD
router.get('/', listEvents);
router.post('/', createEvent);
router.get('/:id', getEvent);
router.delete('/:id', deleteEvent);

// Feedback
router.post('/:id/feedback', postFeedback);

// Check-ins
router.post('/:id/checkin', postCheckin);
router.get('/:id/checkins', getCheckins);

// Mood
router.post('/:id/mood', postMood);
router.get('/:id/mood', getMood);

module.exports = router;
