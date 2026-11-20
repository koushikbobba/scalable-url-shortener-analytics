const Link = require('../models/Link');
const { getCache, setCache, deleteCache } = require('../config/redis');
const { generateRandomShortCode, isReservedAlias } = require('../utils/base62');
const { isValidUrl } = require('../utils/helpers');
const { linksCreatedTotal, cacheHitsTotal } = require('../middleware/metrics');

const CACHE_KEY = (code) => `shortlink:${code}`;
const NEGATIVE_TTL = 60;      // seconds — cache 404s for 60s
const DEFAULT_TTL  = 86400;   // 24 h

// ─── Generate a unique short code ────────────────────────────────────────────

/**
 * Try up to maxAttempts times to generate a unique 6-char code.
 * Falls back to 7-char if 6-char space is saturated.
 */
const generateUniqueShortCode = async (maxAttempts = 10) => {
  for (let i = 0; i < maxAttempts; i++) {
    const length = i < 7 ? 6 : 7;
    const code = generateRandomShortCode(length);
    if (isReservedAlias(code)) continue;
    const exists = await Link.exists({ shortCode: code });
    if (!exists) return code;
  }
  throw new Error('Could not generate unique short code. Please retry.');
};

// ─── Create a link ────────────────────────────────────────────────────────────

const createLink = async ({ originalUrl, customAlias, title, expiresAt, ownerId }) => {
  if (!isValidUrl(originalUrl)) {
    const err = new Error('Invalid URL. Must start with http:// or https://');
    err.status = 400;
    throw err;
  }

  let shortCode;
  if (customAlias) {
    if (isReservedAlias(customAlias)) {
      const err = new Error(`"${customAlias}" is a reserved alias.`);
      err.status = 400;
      throw err;
    }
    const exists = await Link.exists({ $or: [{ shortCode: customAlias }, { customAlias }] });
    if (exists) {
      const err = new Error(`Custom alias "${customAlias}" is already in use.`);
      err.status = 409;
      throw err;
    }
    shortCode = customAlias;
  } else {
    shortCode = await generateUniqueShortCode();
  }

  const link = await Link.create({
    shortCode,
    originalUrl,
    customAlias: customAlias || null,
    title: title || null,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    owner: ownerId,
  });

  // Prime the cache immediately
  await setLinkCache(link);
  linksCreatedTotal.inc();

  return link;
};

// ─── Fetch destination URL (Cache-Aside) ─────────────────────────────────────

/**
 * Returns the Link document or null.
 * Checks Redis first; falls back to MongoDB; writes back to cache.
 *
 * IMPORTANT: Checks for `not_found: true` negative-cache entry BEFORE
 * treating the value as a full link (avoids the KeyError bug in Django version).
 */
const getDestination = async (shortCode) => {
  const cached = await getCache(CACHE_KEY(shortCode));

  if (cached !== null) {
    // Negative cache hit
    if (cached.not_found) {
      cacheHitsTotal.inc({ result: 'hit' });
      return null;
    }
    cacheHitsTotal.inc({ result: 'hit' });
    return { ...cached, from_cache: true };
  }

  cacheHitsTotal.inc({ result: 'miss' });

  const link = await Link.findOne({ shortCode });
  if (!link) {
    // Write negative cache
    await setCache(CACHE_KEY(shortCode), { not_found: true }, NEGATIVE_TTL);
    return null;
  }

  await setLinkCache(link);
  return link.toJSON();
};

// ─── Cache helpers ────────────────────────────────────────────────────────────

const setLinkCache = async (link) => {
  const data = typeof link.toJSON === 'function' ? link.toJSON() : link;
  let ttl = DEFAULT_TTL;
  if (data.expires_at) {
    const secsUntilExpiry = Math.floor((new Date(data.expires_at) - Date.now()) / 1000);
    if (secsUntilExpiry <= 0) {
      // Already expired — write negative cache
      await setCache(CACHE_KEY(data.short_code), { not_found: true }, NEGATIVE_TTL);
      return;
    }
    ttl = Math.min(DEFAULT_TTL, secsUntilExpiry);
  }
  await setCache(CACHE_KEY(data.short_code), data, ttl);
};

const invalidateLinkCache = async (shortCode) => {
  await deleteCache(CACHE_KEY(shortCode));
};

// ─── Increment click count ────────────────────────────────────────────────────

const incrementClickCount = async (linkId) => {
  await Link.findByIdAndUpdate(linkId, { $inc: { clickCount: 1 } });
};

module.exports = {
  createLink,
  getDestination,
  generateUniqueShortCode,
  setLinkCache,
  invalidateLinkCache,
  incrementClickCount,
};
