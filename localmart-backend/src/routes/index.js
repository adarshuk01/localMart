const router = require('express').Router()

// ── Health check ──────────────────────────────────────────
router.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'LocalMart API is running 🚀',
    env:     process.env.NODE_ENV,
    time:    new Date().toISOString(),
    version: require('../../package.json').version,
  })
})

// ── Route modules ─────────────────────────────────────────
router.use('/auth',       require('./auth/authRoutes'))
router.use('/admin',      require('./admin/adminRoutes'))
router.use('/shopkeeper', require('./shopkeeper/shopkeeperRoutes'))
router.use('/delivery',   require('./delivery/deliveryRoutes'))
router.use('/user',       require('./user/userRoutes'))

module.exports = router
