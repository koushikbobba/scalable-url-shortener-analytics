const { slidingWindowCheck } = require('../config/redis');
const { getClientIp } = require('../utils/helpers');

const WINDOW_MS = 60 * 1000; // 1 minute

/**
 * Build a rate-limiter middleware.
 * @param {object} opts
 *   limit     - max requests per window
 *   keyFn     - (req) => string key
 *   errorMsg  - message on 429
 */
const makeRateLimiter = ({ limit, keyFn, errorMsg = 'Rate limit exceeded.' }) =>
  async (req, res, next) => {
    const key = `rl:${keyFn(req)}`;
    const { allowed, remaining, resetAt } = await slidingWindowCheck(key, limit, WINDOW_MS);

    res.set({
      'X-RateLimit-Limit': limit,
      'X-RateLimit-Remaining': remaining,
      'X-RateLimit-Reset': Math.ceil(resetAt / 1000),
    });

    if (!allowed) {
      return res.status(429).json({
        detail: errorMsg,
        retry_after: Math.ceil((resetAt - Date.now()) / 1000),
      });
    }
    next();
  };

// Anonymous: 30 req/min per IP
const anonRateLimit = makeRateLimiter({
  limit: parseInt(process.env.RATE_LIMIT_ANON || '30', 10),
  keyFn: (req) => `anon:${getClientIp(req)}`,
  errorMsg: 'Too many requests. Limit: 30/min for anonymous users.',
});

// Authenticated: 60 req/min per user ID
const authRateLimit = makeRateLimiter({
  limit: parseInt(process.env.RATE_LIMIT_AUTH || '60', 10),
  keyFn: (req) => `auth:${req.userId || getClientIp(req)}`,
  errorMsg: 'Too many requests. Limit: 60/min for authenticated users.',
});

// Link creation: 20 links/min per user ID
const linkCreateRateLimit = makeRateLimiter({
  limit: parseInt(process.env.RATE_LIMIT_LINK_CREATE || '20', 10),
  keyFn: (req) => `linkcreate:${req.userId || getClientIp(req)}`,
  errorMsg: 'Link creation rate limit exceeded. Limit: 20 links/min.',
});

module.exports = { anonRateLimit, authRateLimit, linkCreateRateLimit };
