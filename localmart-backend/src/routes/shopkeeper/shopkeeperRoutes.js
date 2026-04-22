const router      = require('express').Router()
const ctrl        = require('../../controllers/shopkeeper/shopkeeperController')
const { protect, restrictTo } = require('../../middleware/auth')
const { validateObjectId, uploadLimiter } = require('../../middleware/rateLimiter')
const { upload }  = require('../../utils/fileUpload')

// All shopkeeper routes require auth + shopkeeper role
router.use(protect, restrictTo('shopkeeper', 'admin'))

// ── My shop ───────────────────────────────────────────────
router.get ('/shop',           ctrl.getMyShop)
router.post('/shop',           upload.single('coverImage'), ctrl.createShop)
router.put ('/shop',           upload.single('coverImage'), ctrl.updateShop)
router.get ('/shop/dashboard', ctrl.getShopDashboard)
router.get ('/shop/analytics', ctrl.getShopAnalytics)

// ── Products ──────────────────────────────────────────────
router.get   ('/products',                           ctrl.getProducts)
router.get   ('/products/low-stock',                 ctrl.getLowStockProducts)
router.post  ('/products', uploadLimiter, upload.single('image'), ctrl.createProduct)
router.put   ('/products/:id', validateObjectId(), upload.single('image'), ctrl.updateProduct)
router.delete('/products/:id', validateObjectId(), ctrl.deleteProduct)
router.post  ('/products/:id/toggle', validateObjectId(), ctrl.toggleProduct)

// ── Orders ────────────────────────────────────────────────
router.get ('/orders',                              ctrl.getShopOrders)
router.put ('/orders/:id/status', validateObjectId(), ctrl.updateOrderStatus)
router.put ('/orders/:id/assign', validateObjectId(), ctrl.assignDelivery)
router.post('/orders/:id/auto-assign', validateObjectId(), ctrl.autoAssignDelivery)

// ── Delivery Riders ───────────────────────────────────────
router.get ('/delivery-riders',                     ctrl.getDeliveryRiders)

// ── Team ──────────────────────────────────────────────────
router.get   ('/team',                           ctrl.getTeam)
router.post  ('/team',                           ctrl.addTeamMember)
router.put   ('/team/:id', validateObjectId(), ctrl.updateTeamMember)
router.delete('/team/:id', validateObjectId(), ctrl.removeTeamMember)

module.exports = router
