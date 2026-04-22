const Shop           = require('../../models/Shop')
const User           = require('../../models/User')
const Order          = require('../../models/Order')
const Product        = require('../../models/Product')
const Review         = require('../../models/Review')
const { Notification }= require('../../models/Cart')
const { asyncHandler, AppError, sendSuccess } = require('../../utils/AppError')
const APIFeatures    = require('../../utils/APIFeatures')
const logger         = require('../../utils/logger')

// ─────────────────────────────────────────────────────────
//  DASHBOARD
// ─────────────────────────────────────────────────────────
exports.getDashboard = asyncHandler(async (_req, res) => {
  const [
    totalShops, pendingShops, approvedShops,
    totalUsers, totalOrders, revenueAgg,
    recentShops, recentOrders, categoryDist,
  ] = await Promise.all([
    Shop.countDocuments(),
    Shop.countDocuments({ status: 'pending'  }),
    Shop.countDocuments({ status: 'approved' }),
    User.countDocuments({ role: { $in: ['user', 'shopkeeper'] } }),
    Order.countDocuments(),
    Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
    Shop.find().sort('-createdAt').limit(5).populate('ownerId', 'name email'),
    Order.find().sort('-createdAt').limit(8).populate('userId', 'name').populate('shopId', 'name'),
    Shop.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  ])

  // Monthly revenue (last 6 months)
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const monthlyRevenue = await Order.aggregate([
    { $match: { paymentStatus: 'paid', createdAt: { $gte: sixMonthsAgo } } },
    {
      $group: {
        _id:      { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        revenue:  { $sum: '$total' },
        orders:   { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ])

  sendSuccess(res, {
    stats: {
      totalShops,
      pendingShops,
      approvedShops,
      totalUsers,
      totalOrders,
      totalRevenue: revenueAgg[0]?.total || 0,
    },
    monthlyRevenue,
    categoryDist,
    recentShops,
    recentOrders,
  })
})

// ─────────────────────────────────────────────────────────
//  SHOP MANAGEMENT
// ─────────────────────────────────────────────────────────
exports.getAllShops = asyncHandler(async (req, res) => {
  const features = new APIFeatures(
    Shop.find().populate('ownerId', 'name email phone'),
    req.query
  )
    .filter()
    .search(['name', 'address.full', 'category'])
    .sort('-createdAt')
    .limitFields()
    .paginate()

  const [shops, total] = await Promise.all([
    features.query,
    Shop.countDocuments(),
  ])

  sendSuccess(res, { shops }, 200, {
    total,
    page:  features._page,
    limit: features._limit,
  })
})

exports.getShopById = asyncHandler(async (req, res) => {
  const shop = await Shop.findById(req.params.id)
    .populate('ownerId', 'name email phone avatar')

  if (!shop) throw new AppError('Shop not found.', 404)

  const [products, reviews, orderStats] = await Promise.all([
    Product.find({ shopId: shop._id }).select('name category price stock isActive'),
    Review.find({ shopId: shop._id }).populate('userId', 'name avatar').limit(5).sort('-createdAt'),
    Order.aggregate([
      { $match: { shopId: shop._id } },
      { $group: { _id: '$status', count: { $sum: 1 }, revenue: { $sum: '$total' } } },
    ]),
  ])

  sendSuccess(res, { shop, products, reviews, orderStats })
})

exports.approveShop = asyncHandler(async (req, res) => {
  const shop = await Shop.findById(req.params.id)
  if (!shop) throw new AppError('Shop not found.', 404)

  shop.status     = 'approved'
  shop.approvedAt = new Date()
  shop.approvedBy = req.user._id
  await shop.save()

  // Notify shopkeeper
  await Notification.create({
    userId: shop.ownerId,
    type:   'shop_approved',
    title:  '🎉 Your shop has been approved!',
    body:   `${shop.name} is now live on LocalMart.`,
    data:   { shopId: shop._id },
  })

  logger.info(`Shop approved: ${shop.name} by admin ${req.user.email}`)
  sendSuccess(res, { shop }, 200, { message: 'Shop approved successfully.' })
})

exports.rejectShop = asyncHandler(async (req, res) => {
  const { reason } = req.body
  if (!reason?.trim()) throw new AppError('Rejection reason is required.', 400)

  const shop = await Shop.findById(req.params.id)
  if (!shop) throw new AppError('Shop not found.', 404)

  shop.status          = 'rejected'
  shop.rejectionReason = reason
  await shop.save()

  await Notification.create({
    userId: shop.ownerId,
    type:   'shop_rejected',
    title:  'Shop application rejected',
    body:   `Reason: ${reason}`,
    data:   { shopId: shop._id },
  })

  logger.info(`Shop rejected: ${shop.name} — ${reason}`)
  sendSuccess(res, { shop }, 200, { message: 'Shop rejected.' })
})

exports.suspendShop = asyncHandler(async (req, res) => {
  const shop = await Shop.findByIdAndUpdate(req.params.id, { status: 'suspended' }, { new: true })
  if (!shop) throw new AppError('Shop not found.', 404)
  sendSuccess(res, { shop }, 200, { message: 'Shop suspended.' })
})

exports.deleteShop = asyncHandler(async (req, res) => {
  const shop = await Shop.findById(req.params.id)
  if (!shop) throw new AppError('Shop not found.', 404)
  await Promise.all([
    Product.deleteMany({ shopId: shop._id }),
    Review.deleteMany({  shopId: shop._id }),
    Order.deleteMany({   shopId: shop._id }),
    shop.deleteOne(),
  ])
  sendSuccess(res, null, 200, { message: 'Shop and all related data deleted.' })
})

// ─────────────────────────────────────────────────────────
//  USER MANAGEMENT
// ─────────────────────────────────────────────────────────
exports.getAllUsers = asyncHandler(async (req, res) => {
  const features = new APIFeatures(User.find(), req.query)
    .filter()
    .search(['name', 'email', 'phone'])
    .sort('-createdAt')
    .limitFields()
    .paginate()

  const [users, total] = await Promise.all([
    features.query,
    User.countDocuments(),
  ])
  sendSuccess(res, { users }, 200, { total, page: features._page, limit: features._limit })
})

exports.getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).populate('shopId', 'name status')
  if (!user) throw new AppError('User not found.', 404)
  sendSuccess(res, { user })
})

exports.updateUser = asyncHandler(async (req, res) => {
  const allowed = ['name', 'phone', 'role', 'isActive', 'isSuspended']
  const updates = {}
  allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f] })

  const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
  if (!user) throw new AppError('User not found.', 404)
  sendSuccess(res, { user }, 200, { message: 'User updated.' })
})

exports.suspendUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isSuspended: true, isActive: false },
    { new: true }
  )
  if (!user) throw new AppError('User not found.', 404)
  sendSuccess(res, { user }, 200, { message: 'User suspended.' })
})

exports.deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
  if (!user) throw new AppError('User not found.', 404)
  if (user.role === 'admin') throw new AppError('Cannot delete an admin account.', 403)
  await user.deleteOne()
  sendSuccess(res, null, 200, { message: 'User deleted.' })
})

// ─────────────────────────────────────────────────────────
//  ANALYTICS
// ─────────────────────────────────────────────────────────
exports.getAnalytics = asyncHandler(async (req, res) => {
  const { from, to } = req.query
  const dateFilter = {}
  if (from) dateFilter.$gte = new Date(from)
  if (to)   dateFilter.$lte = new Date(to)

  const matchStage = Object.keys(dateFilter).length
    ? { $match: { paymentStatus: 'paid', createdAt: dateFilter } }
    : { $match: { paymentStatus: 'paid' } }

  const [revenueByMonth, revenueByCategory, topShops, orderStatusDist, userGrowth] =
    await Promise.all([
      // Revenue by month
      Order.aggregate([
        matchStage,
        {
          $group: {
            _id:     { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
            revenue: { $sum: '$total' },
            orders:  { $sum: 1 },
            avgOrder:{ $avg: '$total' },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),

      // Revenue by shop category
      Order.aggregate([
        matchStage,
        { $lookup: { from: 'shops', localField: 'shopId', foreignField: '_id', as: 'shop' } },
        { $unwind: '$shop' },
        { $group: { _id: '$shop.category', revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
        { $sort: { revenue: -1 } },
      ]),

      // Top shops by revenue
      Order.aggregate([
        matchStage,
        { $group: { _id: '$shopId', revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'shops', localField: '_id', foreignField: '_id', as: 'shop' } },
        { $unwind: '$shop' },
        { $project: { shopName: '$shop.name', revenue: 1, orders: 1 } },
      ]),

      // Order status distribution
      Order.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      // User growth by month
      User.aggregate([
        { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort:  { '_id.year': 1, '_id.month': 1 } },
      ]),
    ])

  sendSuccess(res, { revenueByMonth, revenueByCategory, topShops, orderStatusDist, userGrowth })
})
