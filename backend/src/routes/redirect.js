const express = require('express');
const { getDestination, incrementClickCount } = require('../services/linkService');
const { recordClick } = require('../services/analyticsService');
const { redirectsTotal } = require('../middleware/metrics');
const { anonRateLimit } = require('../middleware/rateLimiter');

const router = express.Router();

// ─── GET /:short_code ─────────────────────────────────────────────────────────
router.get('/:short_code', anonRateLimit, async (req, res, next) => {
  try {
    const { short_code } = req.params;
    const linkData = await getDestination(short_code);

    if (!linkData) {
      return res.status(404).json({ detail: 'Short link not found or has expired.' });
    }

    // Check if link is active
    if (!linkData.is_active) {
      return res.status(410).json({ detail: 'This link has been deactivated.' });
    }

    // Check expiry
    if (linkData.expires_at && new Date(linkData.expires_at) < new Date()) {
      return res.status(410).json({ detail: 'This link has expired.' });
    }

    // Track metrics counter
    const fromCache = !!linkData.from_cache;
    redirectsTotal.inc({ short_code, cache_hit: String(fromCache) });

    // Non-blocking: increment click count + record analytics event
    setImmediate(() => {
      incrementClickCount(linkData.id).catch(() => {});
      recordClick(req, linkData).catch(() => {});
    });

    // HTTP 302 redirect
    return res.redirect(302, linkData.original_url);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
