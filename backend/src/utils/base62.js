/**
 * Base62 encoding/decoding + short-code generation.
 * Mirrors backend/apps/common/base62.py exactly.
 */

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const BASE = 62n; // BigInt for safe large-number arithmetic

const RESERVED_ALIASES = new Set([
  'admin', 'api', 'login', 'register', 'dashboard', 'health', 'metrics',
  'auth', 'links', 'analytics', 'docs', 'schema', 'redoc', 'swagger',
  'static', 'media', 'favicon.ico', 'robots.txt', 'sitemap.xml',
  'terms', 'privacy', 'about', 'contact', 'help', 'status',
  'ping', 'ready', 'live',
]);

/**
 * Encode a non-negative integer (or BigInt) to a Base62 string.
 */
const encode = (num) => {
  let n = BigInt(num);
  if (n === 0n) return ALPHABET[0];
  let result = '';
  while (n > 0n) {
    result = ALPHABET[Number(n % BASE)] + result;
    n = n / BASE;
  }
  return result;
};

/**
 * Decode a Base62 string to a BigInt.
 */
const decode = (str) => {
  let result = 0n;
  for (const ch of str) {
    const idx = ALPHABET.indexOf(ch);
    if (idx === -1) throw new Error(`Invalid Base62 character: ${ch}`);
    result = result * BASE + BigInt(idx);
  }
  return result;
};

/**
 * Generate a random Base62 short code of a given length.
 * Uses crypto-quality randomness via Math.random is NOT used —
 * we build a random 48-bit integer instead for uniform distribution.
 */
const generateRandomShortCode = (length = 6) => {
  const { randomBytes } = require('crypto');
  let code = '';
  while (code.length < length) {
    const buf = randomBytes(6); // 48 bits
    let n = 0n;
    for (const byte of buf) n = (n << 8n) | BigInt(byte);
    const candidate = encode(n).slice(0, length);
    if (candidate.length === length) code = candidate;
  }
  return code;
};

/**
 * Check if an alias is reserved.
 */
const isReservedAlias = (alias) => RESERVED_ALIASES.has(alias.toLowerCase());

module.exports = {
  encode,
  decode,
  generateRandomShortCode,
  isReservedAlias,
  RESERVED_ALIASES,
};
