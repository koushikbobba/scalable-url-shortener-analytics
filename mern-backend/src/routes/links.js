const express = require('express');
const Link = require('../models/Link');
const { authenticateToken } = require('../middleware/auth');
const { authRateLimit, linkCreateRateLimit } = require('../middleware/rateLimiter');
const { createLink, setLinkCache, invalidateLinkCache } = require('../services/linkService');
const { isValidUrl } = require('../utils/helpers');

const router = express.Router();

// All link routes require authentication
router.use(authenticateToken, authRateLimit);

// ─── GET /api/links/ ─────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  || '1', 10));
    const limit = Math.min(100, parseInt(req.query.limit || '20', 10));
    const skip  = (page - 1) * limit;

    const [links, total] = await Promise.all([
      Link.find({ owner: req.userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Link.countDocuments({ owner: req.userId }),
    ]);

    res.json({
      count: total,
      next: total > page * limit ? page + 1 : null,
      previous: page > 1 ? page - 1 : null,
      results: links.map((l) => l.toJSON()),
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/links/:id/ ──────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const link = await Link.findOne({ _id: req.params.id, owner: req.userId });
    if (!link) return res.status(404).json({ detail: 'Link not found.' });
    res.json(link.toJSON());
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/links/ ────────────────────────────────────────────────────────
router.post('/', linkCreateRateLimit, async (req, res, next) => {
  try {
    const { original_url, originalUrl, custom_alias, customAlias, title, expires_at, expiresAt } = req.body;
    const url     = original_url || originalUrl;
    const alias   = custom_alias || customAlias || null;
    const expiry  = expires_at   || expiresAt   || null;

    if (!url) return res.status(400).json({ detail: 'original_url is required.' });

    const link = await createLink({
      originalUrl: url,
      customAlias: alias,
      title,
      expiresAt: expiry,
      ownerId: req.userId,
    });

    res.status(201).json(link.toJSON());
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/links/:id/ ────────────────────────────────────────────────────
router.patch('/:id', async (req, res, next) => {
  try {
    const link = await Link.findOne({ _id: req.params.id, owner: req.userId });
    if (!link) return res.status(404).json({ detail: 'Link not found.' });

    const { original_url, originalUrl, title, is_active, isActive, expires_at, expiresAt } = req.body;
    const url    = original_url || originalUrl;
    const active = is_active    !== undefined ? is_active : isActive;
    const expiry = expires_at   || expiresAt;

    if (url !== undefined) {
      if (!isValidUrl(url)) {
        return res.status(400).json({ detail: 'Invalid URL.' });
      }
      link.originalUrl = url;
    }
    if (title   !== undefined) link.title    = title;
    if (active  !== undefined) link.isActive = active;
    if (expiry  !== undefined) link.expiresAt = expiry ? new Date(expiry) : null;

    await link.save();

    // Invalidate + re-prime cache
    await invalidateLinkCache(link.shortCode);
    await setLinkCache(link);

    res.json(link.toJSON());
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/links/:id/ ───────────────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const link = await Link.findOneAndDelete({ _id: req.params.id, owner: req.userId });
    if (!link) return res.status(404).json({ detail: 'Link not found.' });

    await invalidateLinkCache(link.shortCode);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
