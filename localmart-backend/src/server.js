// ── Load env vars FIRST ───────────────────────────────────
require('dotenv').config()

const app        = require('./app')
const connectDB  = require('./config/database')
const logger     = require('./utils/logger')

// ── Catch unhandled exceptions ────────────────────────────
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION — shutting down…', err)
  process.exit(1)
})

// ── Boot ──────────────────────────────────────────────────
const PORT = process.env.PORT || 5000

const boot = async () => {
  await connectDB()

  const server = app.listen(PORT, () => {
    logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`)
    logger.info(`API: http://localhost:${PORT}/api/v1/health`)
  })

  // ── Graceful shutdown ────────────────────────────────────
  const shutdown = (signal) => {
    logger.warn(`${signal} received — shutting down gracefully…`)
    server.close(() => {
      logger.info('HTTP server closed.')
      const mongoose = require('mongoose')
      mongoose.connection.close(false, () => {
        logger.info('MongoDB connection closed.')
        process.exit(0)
      })
    })
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT',  () => shutdown('SIGINT'))

  // ── Unhandled promise rejections ─────────────────────────
  process.on('unhandledRejection', (err) => {
    logger.error('UNHANDLED REJECTION — shutting down…', err)
    server.close(() => process.exit(1))
  })
}

boot()
