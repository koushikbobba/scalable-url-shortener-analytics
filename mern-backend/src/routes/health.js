const express = require('express');
const { mongoose } = require('../config/database');
const { isRedisAvailable } = require('../config/redis');

const router = express.Router();

// ─── GET /health/live/ ────────────────────────────────────────────────────────
router.get('/live/', (_req, res) => {
  res.json({ status: 'live', service: 'url-shortener-api' });
});

// ─── GET /health/ready/ ───────────────────────────────────────────────────────
router.get('/ready/', async (_req, res) => {
  const dbState = mongoose.connection.readyState;
  // 1 = connected
  const dbOk = dbState === 1;
  const cacheOk = isRedisAvailable();

  const status = dbOk ? 'ready' : 'degraded';
  const httpStatus = dbOk ? 200 : 503;

  res.status(httpStatus).json({
    status,
    database: dbOk ? 'ok' : 'unavailable',
    cache: cacheOk ? 'ok' : 'unavailable (using in-memory fallback)',
  });
});

module.exports = router;
