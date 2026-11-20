const { slidingWindowCheck, setCache, getCache, deleteCache } = require('../config/redis');

describe('In-Memory Sliding Window Rate Limiter & Cache Fallback', () => {
  beforeEach(async () => {
    await deleteCache('test-key');
  });

  it('should allow requests within limit', async () => {
    const key = 'test-rate-limit-user-1';
    const limit = 5;
    const windowMs = 5000;

    for (let i = 1; i <= limit; i++) {
      const res = await slidingWindowCheck(key, limit, windowMs);
      expect(res.allowed).toBe(true);
      expect(res.remaining).toBe(limit - i);
    }
  });

  it('should block requests exceeding the limit', async () => {
    const key = 'test-rate-limit-user-blocked';
    const limit = 3;
    const windowMs = 5000;

    // Use up all 3 tokens
    await slidingWindowCheck(key, limit, windowMs);
    await slidingWindowCheck(key, limit, windowMs);
    await slidingWindowCheck(key, limit, windowMs);

    // 4th request must be blocked
    const fourth = await slidingWindowCheck(key, limit, windowMs);
    expect(fourth.allowed).toBe(false);
    expect(fourth.remaining).toBe(0);
  });

  it('should correctly set and retrieve cache values', async () => {
    const testData = { short_code: 'abc123', original_url: 'https://example.com' };
    await setCache('shortlink:abc123', testData, 60);

    const fetched = await getCache('shortlink:abc123');
    expect(fetched).toEqual(testData);
  });

  it('should delete keys from cache cleanly', async () => {
    await setCache('to-delete', 'value', 60);
    await deleteCache('to-delete');

    const fetched = await getCache('to-delete');
    expect(fetched).toBeNull();
  });
});
