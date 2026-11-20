const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const userSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: uuidv4,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // never return password in queries by default
    },
    firstName: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Blacklisted refresh tokens (logout support)
    blacklistedTokens: {
      type: [String],
      default: [],
      select: false,
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,          // adds createdAt, updatedAt
    versionKey: false,
    _id: false,                // we manage _id ourselves
  }
);

// ─── Pre-save hook: hash password ────────────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ─── Instance method: verify password ────────────────────────────────────────
userSchema.methods.verifyPassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// ─── Instance method: safe public representation ─────────────────────────────
userSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    email: this.email,
    firstName: this.firstName || '',
    lastName: this.lastName || '',
    isActive: this.isActive,
    createdAt: this.createdAt,
    lastLogin: this.lastLogin,
  };
};

const User = mongoose.model('User', userSchema);
module.exports = User;
