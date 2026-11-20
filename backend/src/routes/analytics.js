const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { getLinkAnalytics, getOverviewAnalytics } = require('../services/analyticsService');

const router = express.Router();

// All analytics routes require authentication
router.use(authenticateToken);

// ─── GET /api/analytics/overview/ ────────────────────────────────────────────
router.get('/overview/', async (req, res, next) => {
  try {
    const days = parseInt(req.query.days || '30', 10);
    const data = await getOverviewAnalytics(req.userId, days);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/analytics/:linkId/ ─────────────────────────────────────────────
router.get('/:linkId/', async (req, res, next) => {
  try {
    const days = parseInt(req.query.days || '30', 10);
    const data = await getLinkAnalytics(req.params.linkId, days);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
