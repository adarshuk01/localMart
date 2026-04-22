const express        = require('express')
const cors           = require('cors')
const helmet         = require('helmet')
const morgan         = require('morgan')
const mongoSanitize  = require('express-mongo-sanitize')
const xss            = require('xss-clean')
const hpp            = require('hpp')
const compression    = require('compression')
const cookieParser   = require('cookie-parser')

const routes         = require('./routes')
const errorHandler   = require('./middleware/errorHandler')
const { AppError }   = require('./utils/AppError')
const logger         = require('./utils/logger')

const app = express()

// ── TRUST PROXY (important for Vercel / proxies) ──────────
app.set('trust proxy', 1)

// ── CORS (FIXED) ─────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'https://local-mart-delta.vercel.app'
]

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true
}))

// ✅ HANDLE PREFLIGHT (CRITICAL FIX)
app.options('*', cors())

// ── Security headers ─────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}))

// ── Logging ──────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
} else {
  app.use(morgan('combined', { stream: logger.stream }))
}

// ── Body parsers ─────────────────────────────────────────
app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({ extended: true, limit: '10kb' }))
app.use(cookieParser())

// ── Data sanitization ────────────────────────────────────
app.use(mongoSanitize())
app.use(xss())

// ── HTTP Parameter Pollution ─────────────────────────────
app.use(hpp({
  whitelist: ['sort', 'fields', 'page', 'limit', 'category', 'status', 'role'],
}))

// ── Compression ──────────────────────────────────────────
app.use(compression())

// ── API Routes ───────────────────────────────────────────
app.use('/api/v1', routes)

// ── 404 handler ──────────────────────────────────────────
app.all('*', (req, _res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404))
})

// ── Global error handler ─────────────────────────────────
app.use(errorHandler)

module.exports = app