require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
const compression = require('compression');

const { connectDB }      = require('./config/database');
const { initRedis }      = require('./config/redis');
const { registerJobs }   = require('./scheduler/jobs');
const { metricsMiddleware, metricsHandler } = require('./middleware/metrics');
const errorHandler       = require('./middleware/errorHandler');

const authRoutes      = require('./routes/auth');
const linksRoutes     = require('./routes/links');
const analyticsRoutes = require('./routes/analytics');
const redirectRoutes  = require('./routes/redirect');
const healthRoutes    = require('./routes/health');

const app  = express();
const PORT = process.env.PORT || 5000;

// ─── Security & Utility Middleware ────────────────────────────────────────────
app.use(helmet());
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// CORS — allow the React dev server and production frontend
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (
        allowedOrigins.includes(origin) ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:')
      ) {
        return cb(null, true);
      }
      cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Prometheus Metrics ───────────────────────────────────────────────────────
app.use(metricsMiddleware);
app.get('/metrics', metricsHandler);

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/links',     linksRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/health',        healthRoutes);

// ─── Short-link Redirect (must be LAST before error handler) ─────────────────
// Only intercepts /:short_code — does not shadow /api/* or /health/*
app.use('/', redirectRoutes);

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Startup ──────────────────────────────────────────────────────────────────
const start = async () => {
  await connectDB();
  await initRedis();

  if (process.env.NODE_ENV !== 'test') {
    registerJobs();
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 LinkStream MERN API running on http://127.0.0.1:${PORT}`);
    console.log(`   Health: http://127.0.0.1:${PORT}/health/live/`);
    console.log(`   Metrics: http://127.0.0.1:${PORT}/metrics`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
  });
};

// Graceful shutdown
const shutdown = (signal) => {
  console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
  process.exit(0);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

if (process.env.NODE_ENV !== 'test') {
  start().catch((err) => {
    console.error('[Server] Fatal startup error:', err);
    process.exit(1);
  });
}

module.exports = app; // for tests
