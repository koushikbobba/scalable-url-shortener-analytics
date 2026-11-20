/**
 * Global Express error handler.
 * Must be registered as the LAST middleware: app.use(errorHandler).
 */
const errorHandler = (err, req, res, next) => {
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = {};
    for (const [field, error] of Object.entries(err.errors)) {
      errors[field] = error.message;
    }
    return res.status(400).json({ detail: 'Validation failed.', errors });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({
      detail: `Duplicate value for ${field}.`,
      field,
    });
  }

  // JWT errors (should be caught in auth middleware, but just in case)
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ detail: 'Invalid token.' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ detail: 'Token expired.', code: 'token_expired' });
  }

  // Mongoose cast error (bad ObjectId / UUID format)
  if (err.name === 'CastError') {
    return res.status(400).json({ detail: `Invalid value for ${err.path}.` });
  }

  // Generic HTTP errors
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error.';

  if (status >= 500) {
    console.error('[Error]', err);
  }

  res.status(status).json({ detail: message });
};

module.exports = errorHandler;
