const router      = require('express').Router()
const ctrl        = require('../../controllers/admin/adminController')
const { protect, restrictTo } = require('../../middleware/auth')
const { validateObjectId }    = require('../../middleware/rateLimiter')

// All admin routes require auth + admin role
router.use(protect, restrictTo('admin'))

// ── Dashboard & analytics ─────────────────────────────────
router.get('/dashboard',  ctrl.getDashboard)
router.get('/analytics',  ctrl.getAnalytics)

// ── Shop management ───────────────────────────────────────
router.get   ('/shops',                       ctrl.getAllShops)
router.get   ('/shops/:id', validateObjectId(), ctrl.getShopById)
router.post  ('/shops/:id/approve', validateObjectId(), ctrl.approveShop)
router.post  ('/shops/:id/reject',  validateObjectId(), ctrl.rejectShop)
router.post  ('/shops/:id/suspend', validateObjectId(), ctrl.suspendShop)
router.delete('/shops/:id',         validateObjectId(), ctrl.deleteShop)

// ── User management ───────────────────────────────────────
router.get   ('/users',                         ctrl.getAllUsers)
router.get   ('/users/:id', validateObjectId(), ctrl.getUserById)
router.put   ('/users/:id', validateObjectId(), ctrl.updateUser)
router.post  ('/users/:id/suspend', validateObjectId(), ctrl.suspendUser)
router.delete('/users/:id', validateObjectId(), ctrl.deleteUser)

module.exports = router
