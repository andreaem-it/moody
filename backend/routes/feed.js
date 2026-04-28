const express = require('express');
const { getFeed } = require('../controllers/feedController');

const router = express.Router();

// GET /feed?context=tonight|weekend|last-minute&userId=demo-user&lat=45.4&lng=9.1
router.get('/', getFeed);

module.exports = router;
