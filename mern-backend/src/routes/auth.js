const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'change_me_in_production';
const ACCESS_EXP  = process.env.JWT_ACCESS_EXPIRES_IN  || '15m';
const REFRESH_EXP = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// ─── Token helpers ────────────────────────────────────────────────────────────

const signTokens = (userId) => ({
  access: jwt.sign({ userId, type: 'access' }, JWT_SECRET, { expiresIn: ACCESS_EXP }),
  refresh: jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, { expiresIn: REFRESH_EXP }),
});

// ─── POST /api/auth/register/ ─────────────────────────────────────────────────
router.post('/register/', async (req, res, next) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ detail: 'Email and password are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ detail: 'Password must be at least 8 characters.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ detail: 'A user with this email already exists.' });
    }

    const user = await User.create({ email, password, firstName, lastName });
    const tokens = signTokens(user._id);

    res.status(201).json({ user: user.toPublicJSON(), tokens });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/auth/login/ ────────────────────────────────────────────────────
router.post('/login/', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ detail: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !(await user.verifyPassword(password))) {
      return res.status(401).json({ detail: 'Invalid credentials.' });
    }
    if (!user.isActive) {
      return res.status(403).json({ detail: 'Account is inactive.' });
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const tokens = signTokens(user._id);
    res.json({ user: user.toPublicJSON(), tokens });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/auth/me/ ────────────────────────────────────────────────────────
router.get('/me/', authenticateToken, (req, res) => {
  res.json(req.user.toPublicJSON());
});

// ─── POST /api/auth/logout/ ──────────────────────────────────────────────────
router.post('/logout/', authenticateToken, async (req, res, next) => {
  try {
    const { refresh } = req.body;
    // Blacklist the refresh token so it cannot be reused
    if (refresh) {
      await User.findByIdAndUpdate(req.userId, {
        $addToSet: { blacklistedTokens: refresh },
      });
    }
    res.json({ message: 'Successfully logged out.' });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/auth/token/refresh/ ───────────────────────────────────────────
router.post('/token/refresh/', async (req, res, next) => {
  try {
    const { refresh } = req.body;
    if (!refresh) {
      return res.status(400).json({ detail: 'Refresh token is required.' });
    }

    let payload;
    try {
      payload = jwt.verify(refresh, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ detail: 'Invalid or expired refresh token.' });
    }

    if (payload.type !== 'refresh') {
      return res.status(401).json({ detail: 'Token type mismatch.' });
    }

    // Check blacklist
    const user = await User.findById(payload.userId).select('+blacklistedTokens');
    if (!user) return res.status(401).json({ detail: 'User not found.' });
    if (user.blacklistedTokens?.includes(refresh)) {
      return res.status(401).json({ detail: 'Refresh token has been revoked.' });
    }

    const newAccess = jwt.sign({ userId: payload.userId, type: 'access' }, JWT_SECRET, {
      expiresIn: ACCESS_EXP,
    });
    res.json({ access: newAccess });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
