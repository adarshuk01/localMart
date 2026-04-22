const router = require('express').Router()
const ctrl   = require('../../controllers/delivery/deliveryController')
const { protect, restrictTo } = require('../../middleware/auth')
const { validateObjectId }    = require('../../middleware/rateLimiter')

// All delivery routes require auth + delivery role
router.use(protect, restrictTo('delivery', 'shopkeeper', 'admin'))

router.get ('/dashboard',                            ctrl.getDashboard)
router.get ('/orders',                               ctrl.getActiveOrders)
router.get ('/shop-orders',                          ctrl.getShopOrders)
router.get ('/history',                              ctrl.getHistory)
router.get ('/earnings',                             ctrl.getEarnings)
router.post('/orders/:id/delivered', validateObjectId(), ctrl.markDelivered)

module.exports = router
