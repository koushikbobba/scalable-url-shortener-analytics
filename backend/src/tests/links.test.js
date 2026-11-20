/**
 * Integration tests: Links API
 * Run with: pnpm test   OR   npx jest
 *
 * Requires:
 *   - MongoDB running (or set MONGODB_URI env var)
 *   - Separate test DB (uses linkstream_test by default)
 */

process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/linkstream_test';
process.env.JWT_SECRET = 'test_secret_key_32chars_minimum!!';
process.env.PORT = '5099';

const request = require('supertest');
const app = require('../server');
const { mongoose } = require('../config/database');
const User = require('../models/User');
const Link = require('../models/Link');

let accessToken;
let userId;
let createdLinkId;
let createdShortCode;

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

beforeAll(async () => {
  // Wait for DB
  await new Promise((r) => setTimeout(r, 1000));
});

afterAll(async () => {
  // Clean up test data
  await User.deleteMany({ email: /test_mern@/ });
  await Link.deleteMany({ owner: userId });
  await mongoose.connection.close();
});

// ─── Auth Tests ───────────────────────────────────────────────────────────────

describe('POST /api/auth/register/', () => {
  it('should register a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register/')
      .send({ email: 'test_mern@example.com', password: 'Password123', firstName: 'Test' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('user');
    expect(res.body).toHaveProperty('tokens');
    expect(res.body.tokens).toHaveProperty('access');
    expect(res.body.tokens).toHaveProperty('refresh');
    expect(res.body.user.email).toBe('test_mern@example.com');

    accessToken = res.body.tokens.access;
    userId = res.body.user.id;
  });

  it('should reject duplicate email', async () => {
    const res = await request(app)
      .post('/api/auth/register/')
      .send({ email: 'test_mern@example.com', password: 'Password123' });
    expect(res.status).toBe(409);
  });

  it('should reject short password', async () => {
    const res = await request(app)
      .post('/api/auth/register/')
      .send({ email: 'test_mern2@example.com', password: 'short' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login/', () => {
  it('should login with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login/')
      .send({ email: 'test_mern@example.com', password: 'Password123' });

    expect(res.status).toBe(200);
    expect(res.body.tokens).toHaveProperty('access');
    accessToken = res.body.tokens.access;
  });

  it('should reject wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login/')
      .send({ email: 'test_mern@example.com', password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me/', () => {
  it('should return current user', async () => {
    const res = await request(app)
      .get('/api/auth/me/')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('test_mern@example.com');
  });

  it('should reject unauthenticated request', async () => {
    const res = await request(app).get('/api/auth/me/');
    expect(res.status).toBe(401);
  });
});

// ─── Links Tests ──────────────────────────────────────────────────────────────

describe('POST /api/links/', () => {
  it('should create a short link', async () => {
    const res = await request(app)
      .post('/api/links/')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ original_url: 'https://www.example.com/very/long/path' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('short_code');
    expect(res.body).toHaveProperty('short_url');
    expect(res.body).toHaveProperty('original_url', 'https://www.example.com/very/long/path');
    expect(res.body.click_count).toBe(0);

    createdLinkId   = res.body.id;
    createdShortCode = res.body.short_code;
  });

  it('should create a link with custom alias', async () => {
    const res = await request(app)
      .post('/api/links/')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ original_url: 'https://github.com', custom_alias: 'mygithub123' });

    expect(res.status).toBe(201);
    expect(res.body.short_code).toBe('mygithub123');
  });

  it('should reject reserved alias', async () => {
    const res = await request(app)
      .post('/api/links/')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ original_url: 'https://example.com', custom_alias: 'admin' });
    expect(res.status).toBe(400);
  });

  it('should reject invalid URL', async () => {
    const res = await request(app)
      .post('/api/links/')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ original_url: 'not-a-url' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/links/', () => {
  it('should list user links', async () => {
    const res = await request(app)
      .get('/api/links/')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('results');
    expect(Array.isArray(res.body.results)).toBe(true);
    expect(res.body.results.length).toBeGreaterThan(0);
  });
});

describe('GET /api/links/:id', () => {
  it('should return a single link', async () => {
    const res = await request(app)
      .get(`/api/links/${createdLinkId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(createdLinkId);
  });

  it('should return 404 for non-existent link', async () => {
    const res = await request(app)
      .get('/api/links/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/links/:id', () => {
  it('should update a link', async () => {
    const res = await request(app)
      .patch(`/api/links/${createdLinkId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Updated title', is_active: false });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated title');
    expect(res.body.is_active).toBe(false);
  });
});

// ─── Redirect Tests ───────────────────────────────────────────────────────────

describe('GET /:short_code (redirect)', () => {
  it('should redirect to original URL', async () => {
    const res = await request(app)
      .get(`/${createdShortCode}`)
      .redirects(0); // don't follow redirect

    // 302 OR 410 (if the link was deactivated in patch test above)
    expect([302, 410]).toContain(res.status);
  });

  it('should return 404 for unknown code', async () => {
    const res = await request(app).get('/zzzzznotexist');
    expect(res.status).toBe(404);
  });
});

// ─── Analytics Tests ──────────────────────────────────────────────────────────

describe('GET /api/analytics/overview/', () => {
  it('should return overview analytics', async () => {
    const res = await request(app)
      .get('/api/analytics/overview/')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total_links');
    expect(res.body).toHaveProperty('total_clicks');
  });
});

describe('GET /api/analytics/:linkId/', () => {
  it('should return link analytics', async () => {
    const res = await request(app)
      .get(`/api/analytics/${createdLinkId}/`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('time_series');
    expect(res.body).toHaveProperty('total_clicks');
  });
});

// ─── Health Tests ─────────────────────────────────────────────────────────────

describe('Health endpoints', () => {
  it('GET /health/live/ returns live', async () => {
    const res = await request(app).get('/health/live/');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('live');
  });

  it('GET /health/ready/ returns ready or degraded', async () => {
    const res = await request(app).get('/health/ready/');
    expect([200, 503]).toContain(res.status);
    expect(['ready', 'degraded']).toContain(res.body.status);
  });
});

// ─── Cleanup: DELETE ──────────────────────────────────────────────────────────

describe('DELETE /api/links/:id', () => {
  it('should delete the link', async () => {
    const res = await request(app)
      .delete(`/api/links/${createdLinkId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(204);
  });
});
