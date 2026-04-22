const logger = require('../utils/logger')

// ── Cast error (invalid ObjectId) ─────────────────────────
const handleCastError = (err) => ({
  message:    `Invalid ${err.path}: ${err.value}`,
  statusCode: 400,
})

// ── Duplicate key error ────────────────────────────────────
const handleDuplicateKey = (err) => {
  const field = Object.keys(err.keyValue)[0]
  const value = err.keyValue[field]
  return {
    message:    `'${value}' is already taken for field '${field}'. Please use a different value.`,
    statusCode: 409,
  }
}

// ── Validation error ──────────────────────────────────────
const handleValidationError = (err) => ({
  message:    Object.values(err.errors).map(e => e.message).join('. '),
  statusCode: 422,
})

// ── JWT errors ────────────────────────────────────────────
const handleJWTError      = () => ({ message: 'Invalid token. Please log in again.',  statusCode: 401 })
const handleJWTExpiredError = () => ({ message: 'Token expired. Please log in again.', statusCode: 401 })

// ── Multer errors ─────────────────────────────────────────
const handleMulterError = (err) => ({
  message:    err.code === 'LIMIT_FILE_SIZE' ? `File too large. Max size: ${process.env.MAX_FILE_SIZE / 1024 / 1024} MB` : err.message,
  statusCode: 400,
})

// ── Dev response ──────────────────────────────────────────
const sendDev = (err, res) => res.status(err.statusCode).json({
  success:    false,
  status:     err.status,
  message:    err.message,
  stack:      err.stack,
  error:      err,
})

// ── Prod response ─────────────────────────────────────────
const sendProd = (err, res) => {
  if (err.isOperational) {
    return res.status(err.statusCode).json({ success: false, message: err.message })
  }
  // Programming / unknown errors — don't leak details
  logger.error('UNEXPECTED ERROR:', err)
  return res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' })
}

// ── Global error handler ───────────────────────────────────
module.exports = (err, req, res, _next) => {
  err.statusCode = err.statusCode || 500
  err.status     = err.status     || 'error'

  logger.error(`${req.method} ${req.originalUrl} → ${err.statusCode}: ${err.message}`)

  if (process.env.NODE_ENV === 'development') return sendDev(err, res)

  let error = { ...err, message: err.message }

  if (err.name  === 'CastError')          error = handleCastError(err)
  if (err.code  === 11000)                error = handleDuplicateKey(err)
  if (err.name  === 'ValidationError')    error = handleValidationError(err)
  if (err.name  === 'JsonWebTokenError')  error = handleJWTError()
  if (err.name  === 'TokenExpiredError')  error = handleJWTExpiredError()
  if (err.name  === 'MulterError')        error = handleMulterError(err)

  const appErr = new Error(error.message)
  appErr.statusCode   = error.statusCode || 500
  appErr.status       = `${appErr.statusCode}`.startsWith('4') ? 'fail' : 'error'
  appErr.isOperational = true

  sendProd(appErr, res)
}
