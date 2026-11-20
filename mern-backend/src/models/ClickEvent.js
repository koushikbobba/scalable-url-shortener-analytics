const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const clickEventSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: uuidv4,
    },
    link: {
      type: String,
      ref: 'Link',
      required: true,
      index: true,
    },
    shortCode: {
      type: String,
      required: true,
    },
    // Visitor fingerprint (hashed)
    ipHash: {
      type: String,
    },
    // User-agent breakdown
    browser: { type: String, default: 'unknown' },
    os: { type: String, default: 'unknown' },
    device: { type: String, default: 'unknown' },   // desktop | mobile | tablet
    // Geo
    country: { type: String, default: 'unknown' },
    city: { type: String, default: 'unknown' },
    // Referrer
    referer: { type: String, default: null },
    // Timestamp (indexed for range queries + aggregation)
    clickedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    versionKey: false,
    _id: false,
  }
);

// TTL index — auto-expire after CLICK_EVENT_RETENTION_DAYS (default 90 days)
const retentionDays = parseInt(process.env.CLICK_EVENT_RETENTION_DAYS || '90', 10);
clickEventSchema.index({ clickedAt: 1 }, { expireAfterSeconds: retentionDays * 86400 });

// Compound index for per-link time-series queries
clickEventSchema.index({ link: 1, clickedAt: -1 });
clickEventSchema.index({ shortCode: 1, clickedAt: -1 });

const ClickEvent = mongoose.model('ClickEvent', clickEventSchema);
module.exports = ClickEvent;
