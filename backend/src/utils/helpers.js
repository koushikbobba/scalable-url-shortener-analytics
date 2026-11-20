const crypto = require('crypto');
const { UAParser } = require('ua-parser-js');
const validator = require('validator');

/**
 * Hash an IP address with SHA-256 for privacy-safe storage.
 */
const hashIp = (ip) => {
  if (!ip) return null;
  return crypto.createHash('sha256').update(ip).digest('hex').slice(0, 32);
};

/**
 * Extract the real client IP from common proxy headers.
 */
const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return (
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    '127.0.0.1'
  );
};

/**
 * Parse the User-Agent string into browser / os / device fields.
 * Returns { browser, os, device } — all strings.
 */
const parseUserAgent = (uaString) => {
  if (!uaString) return { browser: 'unknown', os: 'unknown', device: 'unknown' };

  const parser = new UAParser(uaString);
  const result = parser.getResult();

  const browser = result.browser?.name || 'unknown';
  const os = result.os?.name || 'unknown';

  let device = 'desktop';
  const deviceType = result.device?.type;
  if (deviceType === 'mobile') device = 'mobile';
  else if (deviceType === 'tablet') device = 'tablet';

  return { browser, os, device };
};

/**
 * Stub geo-location extractor.
 * In production, replace with a MaxMind GeoIP2 lookup.
 * Returns { country, city }.
 */
const extractGeoLocation = async (ip) => {
  // Localhost / private IPs
  if (!ip || ip === '127.0.0.1' || ip.startsWith('192.168') || ip.startsWith('10.')) {
    return { country: 'local', city: 'local' };
  }
  // TODO: integrate MaxMind GeoLite2 or ip-api.com
  return { country: 'unknown', city: 'unknown' };
};

/**
 * Validate that a string is a proper URL (http/https).
 */
const isValidUrl = (url) => {
  try {
    return validator.isURL(url, {
      protocols: ['http', 'https'],
      require_protocol: true,
      require_valid_protocol: true,
      allow_underscores: false,
    });
  } catch {
    return false;
  }
};

/**
 * Sleep for N milliseconds (async).
 */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = { hashIp, getClientIp, parseUserAgent, extractGeoLocation, isValidUrl, sleep };
