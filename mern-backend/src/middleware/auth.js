const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'change_me_in_production';

/**
 * Middleware: verify Bearer JWT and attach req.user.
 * Returns 401 if token missing/invalid, 403 if user inactive.
 */
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ detail: 'Authentication credentials were not provided.' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);

    // Check token type
    if (payload.type !== 'access') {
      return res.status(401).json({ detail: 'Invalid token type.' });
    }

    const user = await User.findById(payload.userId).select('+blacklistedTokens');
    if (!user) {
      return res.status(401).json({ detail: 'User not found.' });
    }
    if (!user.isActive) {
      return res.status(403).json({ detail: 'User account is inactive.' });
    }

    req.user = user;
    req.userId = user._id;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ detail: 'Access token has expired.', code: 'token_expired' });
    }
    return res.status(401).json({ detail: 'Invalid token.' });
  }
};

/**
 * Optional auth — attaches req.user if token present but does NOT block.
 */
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next();
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.type === 'access') {
      const user = await User.findById(payload.userId);
      if (user && user.isActive) req.user = user;
    }
  } catch {
    // ignore token errors for optional auth
  }
  next();
};

module.exports = { authenticateToken, optionalAuth };
