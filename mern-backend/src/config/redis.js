const Redis = require('ioredis');

let redisClient = null;
let redisAvailable = false;

// In-memory fallback store
const memCache = new Map();

const createRedisClient = () => {
  const client = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
    retryStrategy: (times) => {
      if (times > 5) return null; // stop retrying
      return Math.min(times * 200, 2000);
    },
  });

  client.on('connect', () => {
    redisAvailable = true;
    console.log('[Redis] Connected');
  });

  client.on('ready', () => {
    redisAvailable = true;
  });

  client.on('error', (err) => {
    if (redisAvailable) {
      console.warn('[Redis] Error – falling back to in-memory cache:', err.message);
    }
    redisAvailable = false;
  });

  client.on('close', () => {
    redisAvailable = false;
  });

  return client;
};

const initRedis = async () => {
  redisClient = createRedisClient();
  try {
    await redisClient.connect();
  } catch (err) {
    console.warn('[Redis] Could not connect on startup, using in-memory fallback.');
    redisAvailable = false;
  }
};

// ─── Cache helpers ───────────────────────────────────────────────────────────

/**
 * Get a value from cache. Returns parsed JSON or null.
 */
const getCache = async (key) => {
  try {
    if (redisAvailable && redisClient) {
      const val = await redisClient.get(key);
      return val ? JSON.parse(val) : null;
    }
    // In-memory fallback
    const entry = memCache.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      memCache.delete(key);
      return null;
    }
    return entry.value;
  } catch {
    return null;
  }
};

/**
 * Set a value in cache with optional TTL (seconds).
 */
const setCache = async (key, value, ttlSeconds = 86400) => {
  try {
    const serialized = JSON.stringify(value);
    if (redisAvailable && redisClient) {
      await redisClient.setex(key, ttlSeconds, serialized);
      return;
    }
    // In-memory fallback
    memCache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  } catch {
    // silently swallow cache errors
  }
};

/**
 * Delete a cache key.
 */
const deleteCache = async (key) => {
  try {
    if (redisAvailable && redisClient) {
      await redisClient.del(key);
      return;
    }
    memCache.delete(key);
  } catch {
    // silently swallow
  }
};

/**
 * Redis ZSET-based sliding-window rate limiter.
 * Returns { allowed: bool, remaining: int, resetAt: int }
 */
const slidingWindowCheck = async (key, limit, windowMs) => {
  const now = Date.now();
  const windowStart = now - windowMs;

  if (redisAvailable && redisClient) {
    try {
      const pipeline = redisClient.pipeline();
      pipeline.zremrangebyscore(key, '-inf', windowStart);
      pipeline.zadd(key, now, `${now}-${Math.random()}`);
      pipeline.zcard(key);
      pipeline.pexpire(key, windowMs);
      const results = await pipeline.exec();
      const count = results[2][1];
      return {
        allowed: count <= limit,
        remaining: Math.max(0, limit - count),
        resetAt: now + windowMs,
      };
    } catch {
      // fall through to in-memory
    }
  }

  // In-memory fallback using a simple counter per key
  const entry = memCache.get(`rl:${key}`) || { timestamps: [], windowStart: now };
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);
  entry.timestamps.push(now);
  memCache.set(`rl:${key}`, entry);
  const count = entry.timestamps.length;
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetAt: now + windowMs,
  };
};

const isRedisAvailable = () => redisAvailable;
const getRedisClient = () => redisClient;

module.exports = {
  initRedis,
  getCache,
  setCache,
  deleteCache,
  slidingWindowCheck,
  isRedisAvailable,
  getRedisClient,
};
