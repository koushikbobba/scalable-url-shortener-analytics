const { hashIp, parseUserAgent, isValidUrl } = require('../utils/helpers');

describe('IP Hashing Utility (GDPR Compliance)', () => {
  it('should hash IP addresses to 32 hex characters', () => {
    const hash = hashIp('192.168.1.1');
    expect(hash).toHaveLength(32);
    expect(hash).toMatch(/^[0-9a-f]{32}$/);
  });

  it('should return identical hash for the same IP (deterministic)', () => {
    const hash1 = hashIp('203.0.113.195');
    const hash2 = hashIp('203.0.113.195');
    expect(hash1).toBe(hash2);
  });

  it('should produce distinct hashes for different IPs', () => {
    const hash1 = hashIp('10.0.0.1');
    const hash2 = hashIp('10.0.0.2');
    expect(hash1).not.toBe(hash2);
  });

  it('should handle null/empty IP gracefully', () => {
    expect(hashIp(null)).toBeNull();
    expect(hashIp('')).toBeNull();
  });
});

describe('User-Agent Parser Utility', () => {
  it('should parse standard desktop Chrome headers', () => {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
    const parsed = parseUserAgent(ua);

    expect(parsed.browser).toBe('Chrome');
    expect(parsed.os).toBe('Windows');
    expect(parsed.device).toBe('desktop');
  });

  it('should parse mobile iPhone Safari headers', () => {
    const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1';
    const parsed = parseUserAgent(ua);

    expect(parsed.browser).toBe('Mobile Safari');
    expect(parsed.os).toBe('iOS');
    expect(parsed.device).toBe('mobile');
  });

  it('should parse iPad tablet headers', () => {
    const ua = 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
    const parsed = parseUserAgent(ua);

    expect(parsed.device).toBe('tablet');
  });

  it('should handle missing or malformed User-Agent strings', () => {
    const parsed = parseUserAgent('');
    expect(parsed.browser).toBe('unknown');
    expect(parsed.os).toBe('unknown');
    expect(parsed.device).toBe('unknown');
  });
});

describe('URL Validation Utility', () => {
  it('should accept valid HTTP and HTTPS URLs', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
    expect(isValidUrl('http://subdomain.domain.org/path/to/resource?query=1&b=2#section')).toBe(true);
    expect(isValidUrl('https://github.com/koushikbobba/scalable-url-shortener-analytics')).toBe(true);
  });

  it('should reject invalid or non-HTTP URLs', () => {
    expect(isValidUrl('not-a-url')).toBe(false);
    expect(isValidUrl('ftp://ftp.example.com')).toBe(false);
    expect(isValidUrl('javascript:alert(1)')).toBe(false);
    expect(isValidUrl('')).toBe(false);
    expect(isValidUrl(null)).toBe(false);
  });
});
