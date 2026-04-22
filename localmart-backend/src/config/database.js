const mongoose = require('mongoose')
const logger = require('../utils/logger')

let cached = global.mongoose

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null }
}

const connectDB = async () => {
  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    logger.info("Creating new MongoDB connection...")

    cached.promise = mongoose.connect(process.env.MONGO_URI, {
      bufferCommands: false // ✅ VERY IMPORTANT
    })
  }

  cached.conn = await cached.promise

  logger.info(`MongoDB connected: ${cached.conn.connection.host}`)

  return cached.conn
}

module.exports = connectDB