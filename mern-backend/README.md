# LinkStream MERN Backend

> Express.js + MongoDB + Redis backend for the LinkStream URL Shortener & Analytics Platform.  
> Drop-in replacement for the Django backend — same API contract, same frontend.

---

## Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Framework | Express 4 |
| Database | MongoDB 7 (Mongoose ODM) |
| Cache | Redis 7 (ioredis) with in-memory fallback |
| Auth | JWT (access 15m + refresh 7d) |
| Metrics | Prometheus (prom-client) |
| Scheduler | node-cron |
| Testing | Jest + Supertest |

---

## Quick Start

### 1. Prerequisites

- Node.js ≥ 18 (`node -v`)
- MongoDB running locally (`mongod`) OR MongoDB Atlas URI
- Redis running locally (`redis-server`) — optional (falls back to in-memory cache)

### 2. Install dependencies

```bash
cd mern-backend
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env — set MONGODB_URI, JWT_SECRET, etc.
```

### 4. Start the server

```bash
# Development (auto-restart on file changes)
npm run dev

# Production
npm start
```

Server starts on **http://127.0.0.1:5000**

### 5. Update the frontend proxy

Edit `frontend/vite.config.js`:
```js
proxy: {
  '/api': { target: 'http://127.0.0.1:5000', ... }
}
```

---

## API Reference

All routes match the Django backend contract exactly.

### Auth

| Method | URL | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register/` | — | Register new user |
| POST | `/api/auth/login/` | — | Login, returns tokens |
| GET | `/api/auth/me/` | ✅ | Get current user |
| POST | `/api/auth/logout/` | ✅ | Blacklist refresh token |
| POST | `/api/auth/token/refresh/` | — | Refresh access token |

### Links

| Method | URL | Auth | Description |
|---|---|---|---|
| GET | `/api/links/` | ✅ | List user's links |
| POST | `/api/links/` | ✅ | Create a short link |
| GET | `/api/links/:id/` | ✅ | Get single link |
| PATCH | `/api/links/:id/` | ✅ | Update link |
| DELETE | `/api/links/:id/` | ✅ | Delete link |

### Analytics

| Method | URL | Auth | Description |
|---|---|---|---|
| GET | `/api/analytics/overview/` | ✅ | Account-wide stats |
| GET | `/api/analytics/:linkId/` | ✅ | Per-link analytics |

### Public

| Method | URL | Description |
|---|---|---|
| GET | `/:short_code` | Redirect to original URL |
| GET | `/health/live/` | Liveness probe |
| GET | `/health/ready/` | Readiness probe (checks DB + Redis) |
| GET | `/metrics` | Prometheus scrape endpoint |

---

## Rate Limits

| User type | Limit |
|---|---|
| Anonymous | 30 req/min per IP |
| Authenticated | 60 req/min per user |
| Link creation | 20 links/min per user |

---

## Running Tests

```bash
# Requires MongoDB running (uses linkstream_test database)
npm test

# With coverage report
npm run test:coverage
```

---

## Project Structure

```
mern-backend/
├── src/
│   ├── config/
│   │   ├── database.js      # Mongoose connection with retry
│   │   └── redis.js         # ioredis + in-memory fallback + cache helpers
│   ├── middleware/
│   │   ├── auth.js          # JWT authenticateToken / optionalAuth
│   │   ├── rateLimiter.js   # Sliding-window rate limiters
│   │   ├── errorHandler.js  # Global Express error handler
│   │   └── metrics.js       # Prometheus prom-client
│   ├── models/
│   │   ├── User.js          # UUID _id, bcrypt pre-save, toPublicJSON()
│   │   ├── Link.js          # UUID _id, virtuals, snake_case toJSON transform
│   │   ├── ClickEvent.js    # TTL index, analytics telemetry
│   │   └── DailyMetrics.js  # Pre-aggregated rollup per link per day
│   ├── routes/
│   │   ├── auth.js          # Register, login, me, logout, token refresh
│   │   ├── links.js         # Full CRUD
│   │   ├── analytics.js     # Overview + per-link
│   │   ├── redirect.js      # /:short_code → 302
│   │   └── health.js        # /health/live/ + /health/ready/
│   ├── scheduler/
│   │   └── jobs.js          # node-cron: hourly aggregation, weekly purge
│   ├── services/
│   │   ├── linkService.js   # Cache-Aside getDestination, createLink
│   │   └── analyticsService.js # MongoDB aggregation pipelines
│   ├── tests/
│   │   └── links.test.js    # Jest + Supertest integration tests
│   └── server.js            # Express app + startup
├── .env.example
├── .gitignore
└── package.json
```

---

## Key Design Decisions

1. **UUID `_id`** — All models use `uuid v4` for `_id` to match Django's UUID primary keys.
2. **Cache-Aside with negative caching** — 404s are cached for 60s to prevent DB hammering.
3. **Non-blocking analytics** — `recordClick` is called via `setImmediate()` so redirects return instantly.
4. **Redis graceful degradation** — Falls back to in-memory Map if Redis is unavailable.
5. **Snake_case API responses** — Mongoose `toJSON` transform converts camelCase → snake_case to maintain 100% API compatibility with the Django backend.
