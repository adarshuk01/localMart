const Order           = require('../../models/Order')
const Shop            = require('../../models/Shop')
const { asyncHandler, AppError, sendSuccess } = require('../../utils/AppError')
const APIFeatures     = require('../../utils/APIFeatures')

// ── GET /api/delivery/dashboard ────────────────────────────
exports.getDashboard = asyncHandler(async (req, res) => {
  const deliveryId = req.user._id

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [
    activeOrders, todayDelivered, totalDelivered, earnings,
  ] = await Promise.all([
    Order.find({ deliveryPersonId: deliveryId, status: 'out_for_delivery' })
      .populate('shopId', 'name address phone')
      .populate('userId', 'name phone')
      .sort('createdAt'),

    Order.countDocuments({
      deliveryPersonId: deliveryId,
      status:     'delivered',
      deliveredAt:{ $gte: today },
    }),

    Order.countDocuments({ deliveryPersonId: deliveryId, status: 'delivered' }),

    Order.aggregate([
      { $match: { deliveryPersonId: deliveryId, status: 'delivered' } },
      { $group: { _id: null, total: { $sum: '$deliveryFee' } } },
    ]),
  ])

  sendSuccess(res, {
    activeOrders,
    stats: {
      activeOrders:    activeOrders.length,
      todayDelivered,
      totalDelivered,
      totalEarnings:   earnings[0]?.total || 0,
    },
  })
})

// ── GET /api/delivery/orders — active orders ───────────────
exports.getActiveOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({
    deliveryPersonId: req.user._id,
    status:           'out_for_delivery',
  })
    .populate('shopId',  'name address.full phone location')
    .populate('userId',  'name phone address')
    .sort('createdAt')

  sendSuccess(res, { orders })
})

// ── GET /api/delivery/history ──────────────────────────────
exports.getHistory = asyncHandler(async (req, res) => {
  const features = new APIFeatures(
    Order.find({ deliveryPersonId: req.user._id, status: 'delivered' })
      .populate('shopId', 'name')
      .populate('userId', 'name'),
    req.query
  )
    .sort('-deliveredAt')
    .paginate(20)

  const [orders, total] = await Promise.all([
    features.query,
    Order.countDocuments({ deliveryPersonId: req.user._id, status: 'delivered' }),
  ])

  sendSuccess(res, { orders }, 200, { total, page: features._page, limit: features._limit })
})

// ── POST /api/delivery/orders/:id/delivered ────────────────
exports.markDelivered = asyncHandler(async (req, res) => {
  const { otp } = req.body
  const order = await Order.findOne({
    _id:              req.params.id,
    deliveryPersonId: req.user._id,
    status:           'out_for_delivery',
  })

  if (!order) throw new AppError('Order not found or not assigned to you.', 404)

  // OTP verification (optional — pass otp in body)
  if (otp && order.deliveryOtp !== String(otp)) {
    throw new AppError('Invalid delivery OTP.', 400)
  }

  order.isOtpVerified = !!otp
  await order.advanceStatus('delivered', 'Delivered by rider', req.user._id)

  // Update shop revenue
  await Shop.findByIdAndUpdate(order.shopId, {
    $inc: { totalOrders: 1, totalRevenue: order.total },
  })

  sendSuccess(res, { order }, 200, { message: 'Order marked as delivered. 🎉' })
})

// ── GET /api/delivery/earnings ─────────────────────────────
exports.getEarnings = asyncHandler(async (req, res) => {
  const deliveryId = req.user._id

  const [byMonth, total] = await Promise.all([
    Order.aggregate([
      { $match: { deliveryPersonId: deliveryId, status: 'delivered' } },
      {
        $group: {
          _id:       { year: { $year: '$deliveredAt' }, month: { $month: '$deliveredAt' } },
          earnings:  { $sum: '$deliveryFee' },
          deliveries:{ $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
    Order.aggregate([
      { $match: { deliveryPersonId: deliveryId, status: 'delivered' } },
      { $group: { _id: null, total: { $sum: '$deliveryFee' }, count: { $sum: 1 } } },
    ]),
  ])

  sendSuccess(res, {
    byMonth,
    totalEarnings:   total[0]?.total || 0,
    totalDeliveries: total[0]?.count || 0,
  })
})

// ── GET /api/delivery/shop-orders — all orders for this delivery person's shop ──
exports.getShopOrders = asyncHandler(async (req, res) => {
  const user = req.user

  if (!user.shopId) {
    throw new AppError('You are not assigned to a shop. Contact your shopkeeper.', 400)
  }

  const { status } = req.query

  // Build base query — scoped to this delivery person's shop
  const baseMatch = { shopId: user.shopId }
  if (status) baseMatch.status = status

  const features = new APIFeatures(
    Order.find(baseMatch)
      .populate('userId',           'name phone')
      .populate('deliveryPersonId', 'name phone'),
    req.query
  )
    .sort('-createdAt')
    .paginate(20)

  const [orders, total] = await Promise.all([
    features.query,
    Order.countDocuments(baseMatch),
  ])

  sendSuccess(res, { orders }, 200, {
    total,
    page:  features._page,
    limit: features._limit,
  })
})
