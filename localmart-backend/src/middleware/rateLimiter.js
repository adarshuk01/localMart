const rateLimit = require('express-rate-limit')
const { AppError } = require('../utils/AppError')

// ── General API limiter ────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max:      parseInt(process.env.RATE_LIMIT_MAX)        || 100,
  message:  { success: false, message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders:   false,
})

// ── Strict auth limiter ────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      20,
  message:  { success: false, message: 'Too many login attempts. Try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders:   false,
})

// ── Upload limiter ─────────────────────────────────────────
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max:      10,
  message:  { success: false, message: 'Too many uploads. Please slow down.' },
})

// ── Validate ObjectId ──────────────────────────────────────
const validateObjectId = (paramName = 'id') => (req, _res, next) => {
  const id = req.params[paramName]
  if (!id?.match(/^[a-f\d]{24}$/i)) {
    return next(new AppError(`Invalid ID: ${id}`, 400))
  }
  next()
}

// ── Validate query coordinates ─────────────────────────────
const validateCoords = (req, _res, next) => {
  const { lat, lng } = req.query
  if (!lat || !lng)              return next(new AppError('lat and lng are required.', 400))
  if (isNaN(lat) || isNaN(lng)) return next(new AppError('lat and lng must be numbers.', 400))
  next()
}

module.exports = { apiLimiter, authLimiter, uploadLimiter, validateObjectId, validateCoords }
