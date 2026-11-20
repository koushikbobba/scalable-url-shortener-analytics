const cron = require('node-cron');
const { aggregateDailyMetrics, purgeOldClickEvents } = require('../services/analyticsService');

/**
 * Register all background cron jobs.
 * Called once after server startup.
 */
const registerJobs = () => {
  // ── Hourly: aggregate yesterday's metrics (idempotent upsert) ──────────────
  // Runs at minute 5 of every hour so DB is not hammered on the hour
  cron.schedule('5 * * * *', async () => {
    console.log('[Cron] Running daily metrics aggregation...');
    try {
      const count = await aggregateDailyMetrics();
      console.log(`[Cron] Aggregation done. ${count} links processed.`);
    } catch (err) {
      console.error('[Cron] Aggregation failed:', err.message);
    }
  });

  // ── Weekly Sunday 02:00 UTC: purge old click events ───────────────────────
  cron.schedule('0 2 * * 0', async () => {
    const days = parseInt(process.env.CLICK_EVENT_RETENTION_DAYS || '90', 10);
    console.log(`[Cron] Purging click events older than ${days} days...`);
    try {
      const deleted = await purgeOldClickEvents(days);
      console.log(`[Cron] Purge done. ${deleted} events deleted.`);
    } catch (err) {
      console.error('[Cron] Purge failed:', err.message);
    }
  });

  console.log('[Cron] Jobs registered: metrics aggregation (hourly), event purge (weekly).');
};

module.exports = { registerJobs };
