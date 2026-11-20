const promClient = require('prom-client');

// Collect default Node.js metrics (memory, CPU, event loop lag, etc.)
promClient.collectDefaultMetrics({ prefix: 'linkstream_' });

// ─── Custom Counters & Histograms ─────────────────────────────────────────────

const httpRequestsTotal = new promClient.Counter({
  name: 'linkstream_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

const httpRequestDuration = new promClient.Histogram({
  name: 'linkstream_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});

const redirectsTotal = new promClient.Counter({
  name: 'linkstream_redirects_total',
  help: 'Total redirect events',
  labelNames: ['short_code', 'cache_hit'],
});

const rateLimitHits = new promClient.Counter({
  name: 'linkstream_rate_limit_hits_total',
  help: 'Total rate limit 429 responses',
  labelNames: ['limiter_type'],
});

const cacheHitsTotal = new promClient.Counter({
  name: 'linkstream_cache_hits_total',
  help: 'Cache hit/miss counters',
  labelNames: ['result'],  // 'hit' | 'miss'
});

const linksCreatedTotal = new promClient.Counter({
  name: 'linkstream_links_created_total',
  help: 'Total links created',
});

// ─── Middleware ───────────────────────────────────────────────────────────────

/**
 * Records request count and duration for every route.
 */
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const route = req.route?.path || req.path || 'unknown';
    const labels = {
      method: req.method,
      route,
      status_code: res.statusCode,
    };
    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, (Date.now() - start) / 1000);
  });

  next();
};

/**
 * GET /metrics — expose Prometheus scrape endpoint.
 * Optional: protect with METRICS_SECRET header.
 */
const metricsHandler = async (req, res) => {
  const secret = process.env.METRICS_SECRET;
  if (secret && req.headers['x-metrics-secret'] !== secret) {
    return res.status(403).json({ detail: 'Forbidden.' });
  }
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
};

module.exports = {
  metricsMiddleware,
  metricsHandler,
  httpRequestsTotal,
  httpRequestDuration,
  redirectsTotal,
  rateLimitHits,
  cacheHitsTotal,
  linksCreatedTotal,
};
