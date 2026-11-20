const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const linkSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: uuidv4,
    },
    shortCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 20,
    },
    originalUrl: {
      type: String,
      required: [true, 'Original URL is required'],
      trim: true,
    },
    customAlias: {
      type: String,
      trim: true,
      sparse: true,   // allow multiple nulls
      maxlength: 50,
    },
    title: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    clickCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    owner: {
      type: String,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    _id: false,
  }
);

// ─── Virtual: short_url (matches Django LinkSerializer) ───────────────────────
linkSchema.virtual('shortUrl').get(function () {
  const base = process.env.SHORT_DOMAIN_BASE || 'http://127.0.0.1:5000';
  return `${base}/${this.shortCode}`;
});

// ─── toJSON transform – expose virtuals, rename _id → id ─────────────────────
linkSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    // snake_case to match Django API contract
    ret.short_code = ret.shortCode;
    ret.short_url   = ret.shortUrl;
    ret.original_url = ret.originalUrl;
    ret.custom_alias = ret.customAlias || null;
    ret.is_active    = ret.isActive;
    ret.expires_at   = ret.expiresAt || null;
    ret.click_count  = ret.clickCount;
    ret.created_at   = ret.createdAt;
    ret.updated_at   = ret.updatedAt;
    // remove camelCase duplicates
    delete ret.shortCode;
    delete ret.shortUrl;
    delete ret.originalUrl;
    delete ret.customAlias;
    delete ret.isActive;
    delete ret.expiresAt;
    delete ret.clickCount;
    delete ret.createdAt;
    delete ret.updatedAt;
    return ret;
  },
});

// ─── Indexes ─────────────────────────────────────────────────────────────────
linkSchema.index({ shortCode: 1 }, { unique: true });
linkSchema.index({ owner: 1, createdAt: -1 });
linkSchema.index({ customAlias: 1 }, { sparse: true });
linkSchema.index({ expiresAt: 1 }, { sparse: true });

const Link = mongoose.model('Link', linkSchema);
module.exports = Link;
