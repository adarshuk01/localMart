const mongoose = require('mongoose')
const logger   = require('../utils/logger')

const connectDB = async () => {

  console.log(process.env.MONGO_URI);
  
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Mongoose 8 no longer needs these options, but keeping for clarity
    })

    logger.info(`MongoDB connected: ${conn.connection.host} [${conn.connection.name}]`)

    // ── Connection events ────────────────────────────────
    mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'))
    mongoose.connection.on('error',        (err) => logger.error('MongoDB error:', err))

  } catch (err) {
    logger.error(`MongoDB connection failed: ${err.message}`)
    process.exit(1)
  }
}

module.exports = connectDB
