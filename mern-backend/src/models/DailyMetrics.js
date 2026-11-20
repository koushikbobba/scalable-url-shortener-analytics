const mongoose = require('mongoose');

/**
 * Pre-aggregated daily rollup per link.
 * Written by the cron scheduler (hourly / daily).
 */
const dailyMetricsSchema = new mongoose.Schema(
  {
    link: {
      type: String,
      ref: 'Link',
      required: true,
    },
    shortCode: {
      type: String,
      required: true,
    },
    date: {
      type: Date,   // stored as midnight UTC of the day
      required: true,
    },
    clicks: {
      type: Number,
      default: 0,
    },
    // Dimension breakdowns (top-N maps)
    countries: {
      type: Map,
      of: Number,
      default: {},
    },
    browsers: {
      type: Map,
      of: Number,
      default: {},
    },
    devices: {
      type: Map,
      of: Number,
      default: {},
    },
    operatingSystems: {
      type: Map,
      of: Number,
      default: {},
    },
    referers: {
      type: Map,
      of: Number,
      default: {},
    },
    uniqueIps: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// One row per link per day
dailyMetricsSchema.index({ link: 1, date: -1 }, { unique: true });
dailyMetricsSchema.index({ date: -1 });

const DailyMetrics = mongoose.model('DailyMetrics', dailyMetricsSchema);
module.exports = DailyMetrics;
