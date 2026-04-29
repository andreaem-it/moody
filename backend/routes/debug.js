const express = require('express');
const { getRankingLogs } = require('../services/rankingService');

const router = express.Router();

// GET /debug/ranking — last 100 ranking decisions with full score breakdown
router.get('/ranking', (_req, res) => {
  res.json(getRankingLogs());
});

module.exports = router;
