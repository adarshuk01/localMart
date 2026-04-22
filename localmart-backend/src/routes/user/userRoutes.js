const router = require('express').Router()
const ctrl   = require('../../controllers/user/userController')
const { protect, optionalAuth } = require('../../middleware/auth')
const { validateObjectId }      = require('../../middleware/rateLimiter')

// ── Public / optional auth ────────────────────────────────
router.get('/shops/nearby',                     optionalAuth, ctrl.getNearbyShops)
router.get('/shops/search',                     optionalAuth, ctrl.searchShops)
router.get('/shops/category/:category',         optionalAuth, ctrl.getShopsByCategory)
router.get('/shops/:id',  validateObjectId(),   optionalAuth, ctrl.getShopById)
router.get('/shops/:shopId/reviews', validateObjectId('shopId'), ctrl.getShopReviews)

// ── Protected ─────────────────────────────────────────────
router.use(protect)

// Cart
router.get   ('/cart',         ctrl.getCart)
router.post  ('/cart',         ctrl.addToCart)
router.put   ('/cart',         ctrl.updateCartItem)
router.delete('/cart',         ctrl.clearCart)

// Orders
router.post('/orders',                              ctrl.placeOrder)
router.get ('/orders',                              ctrl.getMyOrders)
router.get ('/orders/:id',  validateObjectId(),     ctrl.getOrderById)
router.post('/orders/:id/cancel', validateObjectId(), ctrl.cancelOrder)

// Reviews
router.post('/reviews', ctrl.createReview)

// Notifications
router.get ('/notifications',      ctrl.getNotifications)
router.post('/notifications/read', ctrl.markNotificationsRead)

module.exports = router
