const Shop           = require('../../models/Shop')
const Product        = require('../../models/Product')
const Order          = require('../../models/Order')
const User           = require('../../models/User')
const Review         = require('../../models/Review')
const { asyncHandler, AppError, sendSuccess } = require('../../utils/AppError')
const APIFeatures    = require('../../utils/APIFeatures')
const { shopImageProcessor, productImageProcessor, deleteImage } = require('../../utils/fileUpload')
const logger         = require('../../utils/logger')

// ─────────────────────────────────────────────────────────
//  MY SHOP
// ─────────────────────────────────────────────────────────
exports.getMyShop = asyncHandler(async (req, res) => {
  const shop = await Shop.findOne({ ownerId: req.user._id })
  if (!shop) throw new AppError('You have not registered a shop yet.', 404)
  sendSuccess(res, { shop })
})

exports.createShop = asyncHandler(async (req, res) => {
  const existing = await Shop.findOne({ ownerId: req.user._id })
  if (existing) throw new AppError('You already have a registered shop. Contact admin for multiple shops.', 409)

  const { name, description, category, phone, email, lat, lng, address,
          openTime, closeTime, deliveryRadius, deliveryFee, minOrderAmount } = req.body

  if (!lat || !lng) throw new AppError('Shop coordinates (lat, lng) are required.', 400)

  const shop = await Shop.create({
    name, description, category, phone, email,
    ownerId: req.user._id,
    address: { full: address },
    location: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
    businessHours: {
      monday:    { open: openTime, close: closeTime },
      tuesday:   { open: openTime, close: closeTime },
      wednesday: { open: openTime, close: closeTime },
      thursday:  { open: openTime, close: closeTime },
      friday:    { open: openTime, close: closeTime },
      saturday:  { open: openTime, close: closeTime },
      sunday:    { open: openTime, close: closeTime, closed: true },
    },
    deliveryRadius:   deliveryRadius   || 5,
    deliveryFee:      deliveryFee      || 30,
    minOrderAmount:   minOrderAmount   || 100,
  })

  logger.info(`New shop applied: ${shop.name} by ${req.user.email}`)
  sendSuccess(res, { shop }, 201, { message: 'Shop application submitted. Awaiting admin approval.' })
})

exports.updateShop = asyncHandler(async (req, res) => {
  const shop = await Shop.findOne({ ownerId: req.user._id })
  if (!shop) throw new AppError('Shop not found.', 404)

  const allowed = [
    'name', 'description', 'phone', 'email', 'website',
    'deliveryRadius', 'deliveryFee', 'minOrderAmount', 'freeDeliveryAbove',
    'avgDeliveryTime', 'isOpen', 'tags', 'businessHours',
  ]
  allowed.forEach(f => { if (req.body[f] !== undefined) shop[f] = req.body[f] })

  if (req.body.address) shop.address = { full: req.body.address }
  if (req.body.lat && req.body.lng) {
    shop.location = { type: 'Point', coordinates: [parseFloat(req.body.lng), parseFloat(req.body.lat)] }
  }

  if (req.file) {
    if (shop.coverImage) deleteImage(shop.coverImage)
    shop.coverImage = await shopImageProcessor(req.file.buffer, shop._id)
  }

  await shop.save()
  sendSuccess(res, { shop }, 200, { message: 'Shop updated.' })
})

exports.getShopDashboard = asyncHandler(async (req, res) => {
  const shop = await Shop.findOne({ ownerId: req.user._id })
  if (!shop) throw new AppError('Shop not found.', 404)

  const [
    totalProducts, activeProducts, lowStockProducts,
    totalOrders, pendingOrders, todayOrders,
    revenueAgg, reviews, monthlyRevenue,
  ] = await Promise.all([
    Product.countDocuments({ shopId: shop._id }),
    Product.countDocuments({ shopId: shop._id, isActive: true }),
    Product.countDocuments({ shopId: shop._id, $expr: { $lte: ['$stock', '$lowStockThreshold'] } }),
    Order.countDocuments({ shopId: shop._id }),
    Order.countDocuments({ shopId: shop._id, status: { $in: ['pending', 'preparing'] } }),
    Order.countDocuments({
      shopId: shop._id,
      createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    }),
    Order.aggregate([
      { $match: { shopId: shop._id, paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$total' }, avg: { $avg: '$total' } } },
    ]),
    Review.find({ shopId: shop._id }).sort('-createdAt').limit(3).populate('userId', 'name avatar'),
    Order.aggregate([
      { $match: { shopId: shop._id, paymentStatus: 'paid' } },
      {
        $group: {
          _id:     { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          revenue: { $sum: '$total' },
          orders:  { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 6 },
    ]),
  ])

  sendSuccess(res, {
    shop,
    stats: {
      totalProducts, activeProducts, lowStockProducts,
      totalOrders, pendingOrders, todayOrders,
      totalRevenue: revenueAgg[0]?.total || 0,
      avgOrderValue: revenueAgg[0]?.avg   || 0,
    },
    monthlyRevenue,
    reviews,
  })
})

// ─────────────────────────────────────────────────────────
//  PRODUCTS
// ─────────────────────────────────────────────────────────
exports.getProducts = asyncHandler(async (req, res) => {
  const shop = await Shop.findOne({ ownerId: req.user._id })
  if (!shop) throw new AppError('Shop not found.', 404)

  const features = new APIFeatures(Product.find({ shopId: shop._id }), req.query)
    .filter()
    .search(['name', 'category', 'tags'])
    .sort('-createdAt')
    .paginate()

  const [products, total] = await Promise.all([
    features.query,
    Product.countDocuments({ shopId: shop._id }),
  ])
  sendSuccess(res, { products }, 200, { total, page: features._page, limit: features._limit })
})

exports.createProduct = asyncHandler(async (req, res) => {
  const shop = await Shop.findOne({ ownerId: req.user._id })
  if (!shop) throw new AppError('Shop not found.', 404)
  if (shop.status !== 'approved') throw new AppError('Your shop must be approved before adding products.', 403)

  const product = await Product.create({ ...req.body, shopId: shop._id })

  if (req.file) {
    product.image = await productImageProcessor(req.file.buffer, product._id)
    await product.save()
  }

  sendSuccess(res, { product }, 201, { message: 'Product created.' })
})

exports.updateProduct = asyncHandler(async (req, res) => {
  const shop = await Shop.findOne({ ownerId: req.user._id })
  if (!shop) throw new AppError('Shop not found.', 404)

  let product = await Product.findOne({ _id: req.params.id, shopId: shop._id })
  if (!product) throw new AppError('Product not found.', 404)

  const allowed = ['name', 'description', 'category', 'price', 'mrp', 'unit',
                   'stock', 'isActive', 'isFeatured', 'tags', 'sku', 'barcode',
                   'lowStockThreshold', 'sortOrder']
  allowed.forEach(f => { if (req.body[f] !== undefined) product[f] = req.body[f] })

  if (req.file) {
    if (product.image) deleteImage(product.image)
    product.image = await productImageProcessor(req.file.buffer, product._id)
  }

  await product.save()
  sendSuccess(res, { product }, 200, { message: 'Product updated.' })
})

exports.deleteProduct = asyncHandler(async (req, res) => {
  const shop = await Shop.findOne({ ownerId: req.user._id })
  if (!shop) throw new AppError('Shop not found.', 404)

  const product = await Product.findOne({ _id: req.params.id, shopId: shop._id })
  if (!product) throw new AppError('Product not found.', 404)

  if (product.image) deleteImage(product.image)
  await product.deleteOne()
  sendSuccess(res, null, 200, { message: 'Product deleted.' })
})

exports.toggleProduct = asyncHandler(async (req, res) => {
  const shop = await Shop.findOne({ ownerId: req.user._id })
  const product = await Product.findOne({ _id: req.params.id, shopId: shop?._id })
  if (!product) throw new AppError('Product not found.', 404)

  product.isActive = !product.isActive
  await product.save()
  sendSuccess(res, { product }, 200, { message: `Product ${product.isActive ? 'activated' : 'deactivated'}.` })
})

exports.getLowStockProducts = asyncHandler(async (req, res) => {
  const shop = await Shop.findOne({ ownerId: req.user._id })
  if (!shop) throw new AppError('Shop not found.', 404)

  const products = await Product.find({
    shopId: shop._id,
    $expr: { $lte: ['$stock', '$lowStockThreshold'] },
  }).sort('stock')

  sendSuccess(res, { products, count: products.length })
})

// ─────────────────────────────────────────────────────────
//  ORDERS (shopkeeper view)
// ─────────────────────────────────────────────────────────
exports.getShopOrders = asyncHandler(async (req, res) => {
  const shop = await Shop.findOne({ ownerId: req.user._id })
  if (!shop) throw new AppError('Shop not found.', 404)

  const features = new APIFeatures(
    Order.find({ shopId: shop._id })
      .populate('userId', 'name phone avatar')
      .populate('deliveryPersonId', 'name phone'),
    req.query
  )
    .filter()
    .sort('-createdAt')
    .paginate()

  const [orders, total] = await Promise.all([
    features.query,
    Order.countDocuments({ shopId: shop._id }),
  ])
  sendSuccess(res, { orders }, 200, { total, page: features._page, limit: features._limit })
})

exports.updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, note, deliveryPersonId } = req.body
  const shop = await Shop.findOne({ ownerId: req.user._id })

  const order = await Order.findOne({ _id: req.params.id, shopId: shop?._id })
  if (!order) throw new AppError('Order not found.', 404)

  const VALID_TRANSITIONS = {
    pending:          ['confirmed', 'cancelled'],
    confirmed:        ['preparing', 'cancelled'],
    preparing:        ['out_for_delivery', 'cancelled'],
    out_for_delivery: ['delivered'],
    delivered:        [],
    cancelled:        [],
  }

  if (!VALID_TRANSITIONS[order.status]?.includes(status)) {
    throw new AppError(`Cannot transition from '${order.status}' to '${status}'.`, 400)
  }

  if (status === 'out_for_delivery' && deliveryPersonId) {
    order.deliveryPersonId = deliveryPersonId
  }

  await order.advanceStatus(status, note, req.user._id)

  // Deduct stock when order is confirmed
  if (status === 'confirmed') {
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: -item.qty, totalSold: item.qty },
      })
    }
  }

  sendSuccess(res, { order }, 200, { message: `Order status updated to '${status}'.` })
})

exports.assignDelivery = asyncHandler(async (req, res) => {
  const { deliveryPersonId } = req.body
  const shop = await Shop.findOne({ ownerId: req.user._id })

  const [order, deliveryPerson] = await Promise.all([
    Order.findOne({ _id: req.params.id, shopId: shop?._id }),
    User.findOne({ _id: deliveryPersonId, shopId: shop?._id, role: 'delivery', isActive: true }),
  ])

  if (!order)          throw new AppError('Order not found.', 404)
  if (!deliveryPerson) throw new AppError('Delivery person not found in your team.', 404)

  order.deliveryPersonId = deliveryPersonId
  await order.save()

  sendSuccess(res, { order }, 200, { message: `Delivery assigned to ${deliveryPerson.name}.` })
})

// ─────────────────────────────────────────────────────────
//  TEAM MANAGEMENT (sub-users)
// ─────────────────────────────────────────────────────────
exports.getTeam = asyncHandler(async (req, res) => {
  const shop = await Shop.findOne({ ownerId: req.user._id })
  if (!shop) throw new AppError('Shop not found.', 404)

  const team = await User.find({ shopId: shop._id }).select('-password')
  sendSuccess(res, { team, count: team.length })
})

exports.addTeamMember = asyncHandler(async (req, res) => {
  const shop = await Shop.findOne({ ownerId: req.user._id })
  if (!shop) throw new AppError('Shop not found.', 404)

  const { name, email, phone, role, password } = req.body
  const subRoles = ['delivery', 'stock', 'cashier', 'manager']
  if (!subRoles.includes(role)) throw new AppError(`Invalid role. Allowed: ${subRoles.join(', ')}`, 400)

  const exists = await User.findOne({ email })
  if (exists) throw new AppError('Email already registered.', 409)

  const member = await User.create({
    name, email, phone, role,
    password: password || 'LocalMart@123',
    shopId:   shop._id,
  })

  logger.info(`Team member added: ${email} [${role}] → shop ${shop.name}`)
  sendSuccess(res, { member: member.toSafeObject() }, 201, { message: `${role} added to your team.` })
})

exports.updateTeamMember = asyncHandler(async (req, res) => {
  const shop = await Shop.findOne({ ownerId: req.user._id })
  const member = await User.findOne({ _id: req.params.id, shopId: shop?._id })
  if (!member) throw new AppError('Team member not found.', 404)

  const allowed = ['name', 'phone', 'role', 'isActive']
  allowed.forEach(f => { if (req.body[f] !== undefined) member[f] = req.body[f] })
  await member.save()

  sendSuccess(res, { member: member.toSafeObject() }, 200, { message: 'Team member updated.' })
})

exports.removeTeamMember = asyncHandler(async (req, res) => {
  const shop = await Shop.findOne({ ownerId: req.user._id })
  const member = await User.findOne({ _id: req.params.id, shopId: shop?._id })
  if (!member) throw new AppError('Team member not found.', 404)

  await member.deleteOne()
  sendSuccess(res, null, 200, { message: 'Team member removed.' })
})

// ─────────────────────────────────────────────────────────
//  SHOP ANALYTICS
// ─────────────────────────────────────────────────────────
exports.getShopAnalytics = asyncHandler(async (req, res) => {
  const shop = await Shop.findOne({ ownerId: req.user._id })
  if (!shop) throw new AppError('Shop not found.', 404)

  const [revenueByMonth, topProducts, ordersByStatus, deliveryPersonStats] =
    await Promise.all([
      Order.aggregate([
        { $match: { shopId: shop._id, paymentStatus: 'paid' } },
        {
          $group: {
            _id:     { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
            revenue: { $sum: '$total' },
            orders:  { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        { $limit: 12 },
      ]),

      Product.find({ shopId: shop._id }).sort('-totalSold').limit(5).select('name totalSold price image'),

      Order.aggregate([
        { $match: { shopId: shop._id } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      Order.aggregate([
        { $match: { shopId: shop._id, deliveryPersonId: { $exists: true } } },
        {
          $group: {
            _id:       '$deliveryPersonId',
            delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
            total:     { $sum: 1 },
          },
        },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'person' } },
        { $unwind: '$person' },
        { $project: { name: '$person.name', delivered: 1, total: 1 } },
        { $sort: { delivered: -1 } },
      ]),
    ])

  sendSuccess(res, { revenueByMonth, topProducts, ordersByStatus, deliveryPersonStats })
})

// ─────────────────────────────────────────────────────────
//  DELIVERY RIDER MANAGEMENT
// ─────────────────────────────────────────────────────────

// GET /shopkeeper/delivery-riders — active delivery team + live order load
exports.getDeliveryRiders = asyncHandler(async (req, res) => {
  const shop = await Shop.findOne({ ownerId: req.user._id })
  if (!shop) throw new AppError('Shop not found.', 404)

  const riders = await User.find({
    shopId:   shop._id,
    role:     'delivery',
    isActive: true,
  }).select('-password')

  // Attach how many out_for_delivery orders each rider currently has
  const ridersWithLoad = await Promise.all(
    riders.map(async (r) => {
      const activeOrders = await Order.countDocuments({
        deliveryPersonId: r._id,
        status:           'out_for_delivery',
      })
      return { ...r.toObject(), activeOrders }
    })
  )

  sendSuccess(res, { riders: ridersWithLoad })
})

// POST /shopkeeper/orders/:id/auto-assign — least-loaded rider
exports.autoAssignDelivery = asyncHandler(async (req, res) => {
  const shop = await Shop.findOne({ ownerId: req.user._id })
  if (!shop) throw new AppError('Shop not found.', 404)

  const order = await Order.findOne({ _id: req.params.id, shopId: shop._id })
  if (!order) throw new AppError('Order not found.', 404)

  const ASSIGNABLE = ['pending', 'confirmed', 'preparing', 'out_for_delivery']
  if (!ASSIGNABLE.includes(order.status)) {
    throw new AppError(`Cannot assign a rider to a ${order.status} order.`, 400)
  }

  // All active delivery members for this shop
  const riders = await User.find({
    shopId:   shop._id,
    role:     'delivery',
    isActive: true,
  })

  if (!riders.length) {
    throw new AppError('No active delivery riders in your team. Add one from the Team page.', 400)
  }

  // Count current active deliveries for each rider
  const loads = await Promise.all(
    riders.map(async (r) => ({
      rider: r,
      load:  await Order.countDocuments({
        deliveryPersonId: r._id,
        status:           'out_for_delivery',
      }),
    }))
  )

  // Sort ascending — pick rider with fewest active orders
  loads.sort((a, b) => a.load - b.load)
  const { rider: chosen, load } = loads[0]

  order.deliveryPersonId = chosen._id
  await order.save()

  logger.info(`Auto-assigned order ${order.orderNumber} → ${chosen.name} (load: ${load})`)

  sendSuccess(res, { order, assignedTo: chosen.toSafeObject() }, 200, {
    message: `Auto-assigned to ${chosen.name} (${load} active order${load !== 1 ? 's' : ''}).`,
  })
})
