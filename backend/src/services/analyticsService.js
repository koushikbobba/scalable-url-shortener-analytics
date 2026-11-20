const ClickEvent = require('../models/ClickEvent');
const DailyMetrics = require('../models/DailyMetrics');
const Link = require('../models/Link');
const { hashIp, getClientIp, parseUserAgent, extractGeoLocation } = require('../utils/helpers');

// ─── Ingest a click event (non-blocking) ─────────────────────────────────────

/**
 * Record a single click asynchronously.
 * Call without await from the redirect handler so it doesn't block response time.
 */
const recordClick = async (req, linkDoc) => {
  try {
    const ip = getClientIp(req);
    const { browser, os, device } = parseUserAgent(req.headers['user-agent']);
    const { country, city } = await extractGeoLocation(ip);
    const referer = req.headers['referer'] || req.headers['referrer'] || null;

    await ClickEvent.create({
      link: linkDoc.id || linkDoc._id,
      shortCode: linkDoc.short_code || linkDoc.shortCode,
      ipHash: hashIp(ip),
      browser,
      os,
      device,
      country,
      city,
      referer,
    });
  } catch (err) {
    // Never let analytics errors break the redirect
    console.error('[Analytics] recordClick failed:', err.message);
  }
};

// ─── Aggregate daily metrics (called by cron) ────────────────────────────────

/**
 * Aggregate yesterday's (or a given date's) click events into DailyMetrics.
 * Uses MongoDB aggregation pipeline for efficiency.
 */
const aggregateDailyMetrics = async (dateOverride = null) => {
  const targetDate = dateOverride ? new Date(dateOverride) : new Date();
  targetDate.setUTCDate(targetDate.getUTCDate() - 1);
  const dayStart = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate()));
  const dayEnd = new Date(dayStart.getTime() + 86400000);

  const pipeline = [
    { $match: { clickedAt: { $gte: dayStart, $lt: dayEnd } } },
    {
      $group: {
        _id: '$link',
        shortCode: { $first: '$shortCode' },
        clicks: { $sum: 1 },
        uniqueIps: { $addToSet: '$ipHash' },
        countries: { $push: '$country' },
        browsers: { $push: '$browser' },
        devices: { $push: '$device' },
        operatingSystems: { $push: '$os' },
        referers: { $push: '$referer' },
      },
    },
  ];

  const results = await ClickEvent.aggregate(pipeline);

  for (const row of results) {
    const countMap = (arr) =>
      arr.filter(Boolean).reduce((acc, v) => {
        acc[v] = (acc[v] || 0) + 1;
        return acc;
      }, {});

    await DailyMetrics.findOneAndUpdate(
      { link: row._id, date: dayStart },
      {
        $set: {
          shortCode: row.shortCode,
          clicks: row.clicks,
          uniqueIps: row.uniqueIps.length,
          countries: countMap(row.countries),
          browsers: countMap(row.browsers),
          devices: countMap(row.devices),
          operatingSystems: countMap(row.operatingSystems),
          referers: countMap(row.referers.filter((r) => r)),
        },
      },
      { upsert: true, new: true }
    );
  }

  console.log(`[Analytics] Aggregated ${results.length} links for ${dayStart.toISOString().slice(0, 10)}`);
  return results.length;
};

// ─── Purge old click events ───────────────────────────────────────────────────

const purgeOldClickEvents = async (retentionDays = 90) => {
  const cutoff = new Date(Date.now() - retentionDays * 86400000);
  const result = await ClickEvent.deleteMany({ clickedAt: { $lt: cutoff } });
  console.log(`[Analytics] Purged ${result.deletedCount} click events older than ${retentionDays} days.`);
  return result.deletedCount;
};

// ─── Query: single link analytics ────────────────────────────────────────────

const getLinkAnalytics = async (linkId, days = 30) => {
  const since = new Date(Date.now() - days * 86400000);

  const link = await Link.findById(linkId);
  if (!link) {
    const err = new Error('Link not found.');
    err.status = 404;
    throw err;
  }

  // Time series: clicks per day
  const timeSeries = await ClickEvent.aggregate([
    { $match: { link: linkId, clickedAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$clickedAt' } },
        clicks: { $sum: 1 },
        unique_visitors: { $addToSet: '$ipHash' },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        date: '$_id',
        timestamp: '$_id',
        clicks: 1,
        unique_visitors: { $size: '$unique_visitors' },
        _id: 0,
      },
    },
  ]);

  // Dimension aggregations
  const dimensionPipeline = (field) => [
    { $match: { link: linkId, clickedAt: { $gte: since } } },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
    { $project: { name: '$_id', label: '$_id', count: 1, _id: 0 } },
  ];

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const weekStart = new Date(Date.now() - 7 * 86400000);

  const [
    browsers,
    devices,
    countries,
    operatingSystems,
    referers,
    totalResult,
    uniqueVisitorsResult,
    clicksToday,
    clicksThisWeek,
  ] = await Promise.all([
    ClickEvent.aggregate(dimensionPipeline('browser')),
    ClickEvent.aggregate(dimensionPipeline('device')),
    ClickEvent.aggregate(dimensionPipeline('country')),
    ClickEvent.aggregate(dimensionPipeline('os')),
    ClickEvent.aggregate(dimensionPipeline('referer')),
    ClickEvent.aggregate([
      { $match: { link: linkId, clickedAt: { $gte: since } } },
      { $count: 'total' },
    ]),
    ClickEvent.aggregate([
      { $match: { link: linkId, clickedAt: { $gte: since } } },
      { $group: { _id: '$ipHash' } },
      { $count: 'total' },
    ]),
    ClickEvent.countDocuments({ link: linkId, clickedAt: { $gte: todayStart } }),
    ClickEvent.countDocuments({ link: linkId, clickedAt: { $gte: weekStart } }),
  ]);

  const totalClicks = totalResult[0]?.total || link.clickCount || 0;
  const uniqueVisitors = uniqueVisitorsResult[0]?.total || (totalClicks > 0 ? 1 : 0);

  // Compute percentages for each dimension list
  const withPercentages = (list) => {
    const sum = list.reduce((s, item) => s + item.count, 0) || 1;
    return list.map((item) => ({
      ...item,
      percentage: Math.round((item.count / sum) * 100),
    }));
  };

  return {
    short_code: link.shortCode,
    original_url: link.originalUrl,
    link: link.toJSON(),
    period_days: days,
    total_clicks: totalClicks,
    unique_visitors: uniqueVisitors,
    clicks_today: clicksToday,
    clicks_this_week: clicksThisWeek,
    clicks_over_time: timeSeries,
    time_series: timeSeries,
    top_browsers: withPercentages(browsers),
    top_devices: withPercentages(devices),
    top_countries: withPercentages(countries),
    top_os: withPercentages(operatingSystems),
    top_referrers: withPercentages(referers),
    top_referers: withPercentages(referers),
  };
};

// ─── Query: overview analytics (all links for a user) ────────────────────────

const getOverviewAnalytics = async (userId, days = 30) => {
  const since = new Date(Date.now() - days * 86400000);

  // Get all link IDs for this user
  const links = await Link.find({ owner: userId }).select('_id shortCode originalUrl clickCount');
  const linkIds = links.map((l) => l._id);

  if (linkIds.length === 0) {
    return {
      total_links: 0,
      total_clicks: 0,
      active_links: 0,
      period_days: days,
      time_series: [],
      top_links: [],
    };
  }

  const [timeSeries, topLinks, activeCount] = await Promise.all([
    // Global time series across all user links
    ClickEvent.aggregate([
      { $match: { link: { $in: linkIds }, clickedAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$clickedAt' } },
          clicks: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { date: '$_id', clicks: 1, _id: 0 } },
    ]),
    // Top 10 links by click count in period
    ClickEvent.aggregate([
      { $match: { link: { $in: linkIds }, clickedAt: { $gte: since } } },
      { $group: { _id: '$link', clicks: { $sum: 1 } } },
      { $sort: { clicks: -1 } },
      { $limit: 10 },
    ]),
    Link.countDocuments({ owner: userId, isActive: true }),
  ]);

  // Enrich top links with link metadata
  const linkMap = Object.fromEntries(links.map((l) => [l._id, l]));
  const enrichedTopLinks = topLinks.map((tl) => {
    const lnk = linkMap[tl._id];
    return {
      link_id: tl._id,
      short_code: lnk?.shortCode,
      original_url: lnk?.originalUrl,
      clicks: tl.clicks,
    };
  });

  const totalClicks = timeSeries.reduce((s, d) => s + d.clicks, 0);

  return {
    total_links: links.length,
    active_links: activeCount,
    total_clicks: totalClicks,
    period_days: days,
    time_series: timeSeries,
    top_links: enrichedTopLinks,
  };
};

module.exports = {
  recordClick,
  aggregateDailyMetrics,
  purgeOldClickEvents,
  getLinkAnalytics,
  getOverviewAnalytics,
};
