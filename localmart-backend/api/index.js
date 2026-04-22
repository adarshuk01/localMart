const app = require('../src/app')
const connectDB = require('../src/config/database')

module.exports = async (req, res) => {
  try {
    await connectDB()   // ✅ always ensure connection
    return app(req, res)
  } catch (err) {
    console.error("SERVER ERROR:", err)
    res.status(500).json({
      success: false,
      message: err.message
    })
  }
}