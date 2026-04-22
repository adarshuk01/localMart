const express        = require('express')
const cors           = require('cors')
const helmet         = require('helmet')
const morgan         = require('morgan')
const mongoSanitize  = require('express-mongo-sanitize')
const xss            = require('xss-clean')
const hpp            = require('hpp')
const compression    = require('compression')
const cookieParser   = require('cookie-parser')
const path           = require('path')

const routes         = require('./routes')
const errorHandler   = require('./middleware/errorHandler')
const { apiLimiter } = require('./middleware/rateLimiter')
const { AppError }   = require('./utils/AppError')
const logger         = require('./utils/logger')

const app = express()

// ── Security headers ──────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow image serving
}))

// ── CORS ──────────────────────────────────────────────────
app.use(cors({
  origin:      process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// ── Request logging ───────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
} else {
  app.use(morgan('combined', { stream: logger.stream }))
}

// ── Body parsers ──────────────────────────────────────────
app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({ extended: true, limit: '10kb' }))
app.use(cookieParser())

// ── Data sanitization ─────────────────────────────────────
app.use(mongoSanitize())   // NoSQL injection
app.use(xss())             // XSS attacks

// ── HTTP Parameter Pollution ──────────────────────────────
app.use(hpp({
  whitelist: ['sort', 'fields', 'page', 'limit', 'category', 'status', 'role'],
}))

// ── Compression ───────────────────────────────────────────
app.use(compression())

// ── Static files (uploaded images) ───────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// ── Global rate limiting ──────────────────────────────────


// ── API Routes ────────────────────────────────────────────
app.use('/api/v1', routes)

// ── 404 handler ───────────────────────────────────────────
app.all('*', (req, _res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404))
})

// ── Global error handler ──────────────────────────────────
app.use(errorHandler)

module.exports = app
