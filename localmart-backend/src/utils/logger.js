const { createLogger, format, transports } = require('winston')
const DailyRotateFile = require('winston-daily-rotate-file')
const path = require('path')

const { combine, timestamp, printf, colorize, errors, json } = format

// ── Custom log format ──────────────────────────────────────
const devFormat = printf(({ level, message, timestamp, stack }) =>
  `${timestamp} [${level}]: ${stack || message}`
)

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true })
  ),
  transports: [
    // ── Console ──────────────────────────────────────────
    new transports.Console({
      format: combine(colorize(), devFormat),
      silent: process.env.NODE_ENV === 'test',
    }),

    // ── Rotating file — all logs ─────────────────────────
    new DailyRotateFile({
      filename:      path.join('logs', 'app-%DATE%.log'),
      datePattern:   'YYYY-MM-DD',
      maxFiles:      '14d',
      maxSize:       '20m',
      format:        combine(json()),
    }),

    // ── Rotating file — error logs only ──────────────────
    new DailyRotateFile({
      filename:      path.join('logs', 'error-%DATE%.log'),
      datePattern:   'YYYY-MM-DD',
      maxFiles:      '30d',
      level:         'error',
      format:        combine(json()),
    }),
  ],
})

// ── Morgan-compatible stream ───────────────────────────────
logger.stream = { write: (msg) => logger.http(msg.trim()) }

module.exports = logger
