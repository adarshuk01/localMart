const { createLogger, format, transports } = require('winston')

const { combine, timestamp, printf, colorize, errors, json } = format

// ── Custom log format ──────────────────────────────────────
const devFormat = printf(({ level, message, timestamp, stack }) =>
  `${timestamp} [${level}]: ${stack || message}`
)

const loggerTransports = [
  // ── Console (always) ─────────────────────────────────
  new transports.Console({
    format: combine(colorize(), devFormat),
    silent: process.env.NODE_ENV === 'test',
  }),
]

// ── File transports only when writable (not on Vercel) ────
if (process.env.NODE_ENV !== 'production' && process.env.ENABLE_FILE_LOGS === 'true') {
  const DailyRotateFile = require('winston-daily-rotate-file')
  const path = require('path')

  loggerTransports.push(
    new DailyRotateFile({
      filename:    path.join('logs', 'app-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles:    '14d',
      maxSize:     '20m',
      format:      combine(json()),
    }),
    new DailyRotateFile({
      filename:    path.join('logs', 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles:    '30d',
      level:       'error',
      format:      combine(json()),
    })
  )
}

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true })
  ),
  transports: loggerTransports,
})

// ── Morgan-compatible stream ───────────────────────────────
logger.stream = { write: (msg) => logger.http(msg.trim()) }

module.exports = logger
