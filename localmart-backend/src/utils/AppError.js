// ─────────────────────────────────────────────────────────
//  AppError — operational error with HTTP status
// ─────────────────────────────────────────────────────────
class AppError extends Error {
  constructor(message, statusCode) {
    super(message)
    this.statusCode  = statusCode
    this.status      = `${statusCode}`.startsWith('4') ? 'fail' : 'error'
    this.isOperational = true
    Error.captureStackTrace(this, this.constructor)
  }
}

// ─────────────────────────────────────────────────────────
//  asyncHandler — wraps async route handlers
// ─────────────────────────────────────────────────────────
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)

// ─────────────────────────────────────────────────────────
//  sendSuccess — standard success response
// ─────────────────────────────────────────────────────────
const sendSuccess = (res, data = {}, statusCode = 200, meta = {}) =>
  res.status(statusCode).json({
    success: true,
    ...meta,
    data,
  })

// ─────────────────────────────────────────────────────────
//  sendError — standard error response
// ─────────────────────────────────────────────────────────
const sendError = (res, message, statusCode = 400) =>
  res.status(statusCode).json({
    success: false,
    message,
  })

module.exports = { AppError, asyncHandler, sendSuccess, sendError }
