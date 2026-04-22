const Shop    = require('../../models/Shop')
const Product = require('../../models/Product')
const Order   = require('../../models/Order')
const Review  = require('../../models/Review')
const { Cart, Notification } = require('../../models/Cart')
const { asyncHandler, AppError, sendSuccess } = require('../../utils/AppError')
const APIFeatures = require('../../utils/APIFeatures')
const { nearQuery, nearbyQuery, getDistance, validateCoords } = require('../../utils/geoUtils')

// ─────────────────────────────────────────────────────────
//  SHOP DISCOVERY
// ─────────────────────────────────────────────────────────
exports.getNearbyShops = asyncHandler(async (req, res) => {
  const { lat, lng, radius = 10, category, search, sort = 'distance' } = req.query

  if (!lat || !lng) throw new AppError('lat and lng are required.', 400)
  if (!validateCoords(lat, lng)) throw new AppError('Invalid coordinates.', 400)

  const baseFilter = { status: 'approved' }
  if (category) baseFilter.category = category

  let shops

  if (sort === 'distance') {
    // Sorted by distance using $near
    const geoFilter = { ...baseFilter, ...nearQuery(lng, lat, parseFloat(radius)) }
    shops = await Shop.find(geoFilter)
      .populate('ownerId', 'name')
      .select('-__v')
      .limit(50)
  } else {
    // Within radius, sorted by rating
    const geoFilter = { ...baseFilter, ...nearbyQuery(lng, lat, parseFloat(radius)) }
    shops = await Shop.find(geoFilter)
      .populate('ownerId', 'name')
      .sort('-ratingsAverage -ratingsCount')
      .limit(50)
  }

  // Add computed distance to each shop
  const enriched = shops.map(s => {
    const shopLat = s.location.coordinates[1]
    const shopLng = s.location.coordinates[0]
    return {
      ...s.toObject(),
      distance: parseFloat(getDistance(parseFloat(lat), parseFloat(lng), shopLat, shopLng)),
    }
  })

  // Search filter (post-fetch)
  const filtered = search
    ? enriched.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.description?.toLowerCase().includes(search.toLowerCase())
      )
    : enriched

  sendSuccess(res, { shops: filtered, count: filtered.length })
})

exports.getShopById = asyncHandler(async (req, res) => {
  const shop = await Shop.findOne({ _id: req.params.id, status: 'approved' })
    .populate('ownerId', 'name')

  if (!shop) throw new AppError('Shop not found.', 404)

  const products = await Product.find({ shopId: shop._id, isActive: true })
    .sort('category sortOrder name')
    .select('-__v')

  sendSuccess(res, { shop, products })
})

exports.getShopsByCategory = asyncHandler(async (req, res) => {
  const { lat, lng, radius = 15 } = req.query
  const { category } = req.params

  let query = { status: 'approved', category }
  if (lat && lng && validateCoords(lat, lng)) {
    query = { ...query, ...nearbyQuery(lng, lat, parseFloat(radius)) }
  }

  const shops = await Shop.find(query).sort('-ratingsAverage').limit(30)
  sendSuccess(res, { shops, count: shops.length })
})

exports.searchShops = asyncHandler(async (req, res) => {
  const { q, lat, lng } = req.query
  if (!q) throw new AppError('Search query "q" is required.', 400)

  const query = { status: 'approved', $text: { $search: q } }
  if (lat && lng && validateCoords(lat, lng)) {
    Object.assign(query, nearbyQuery(lng, lat, 20))
  }

  const shops = await Shop.find(query, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(20)

  sendSuccess(res, { shops, count: shops.length })
})

// ─────────────────────────────────────────────────────────
//  CART
// ─────────────────────────────────────────────────────────
exports.getCart = asyncHandler(async (req, res) => {
  let cart = await Cart.findOne({ userId: req.user._id })
    .populate('items.productId', 'name image price mrp unit isActive stock')
    .populate('shopId', 'name deliveryFee minOrderAmount freeDeliveryAbove')

  if (!cart) cart = await Cart.create({ userId: req.user._id, items: [] })
  sendSuccess(res, { cart })
})

exports.addToCart = asyncHandler(async (req, res) => {
  const { productId, qty = 1 } = req.body

  const product = await Product.findById(productId)
  if (!product)            throw new AppError('Product not found.', 404)
  if (!product.isActive)   throw new AppError('Product is not available.', 400)
  if (product.stock < qty) throw new AppError('Insufficient stock.', 400)

  let cart = await Cart.findOne({ userId: req.user._id })
  if (!cart) cart = await Cart.create({ userId: req.user._id, items: [], shopId: product.shopId })

  // Cannot mix shops
  if (cart.shopId && cart.shopId.toString() !== product.shopId.toString() && cart.items.length > 0) {
    throw new AppError('Your cart has items from another shop. Clear your cart first.', 409)
  }

  cart.shopId = product.shopId

  const existing = cart.items.find(i => i.productId.toString() === productId)
  if (existing) {
    existing.qty     = Math.min(existing.qty + qty, product.stock)
    existing.price   = product.price
  } else {
    cart.items.push({ productId, qty, price: product.price })
  }

  await cart.save()
  await cart.populate('items.productId', 'name image price mrp unit')
  sendSuccess(res, { cart }, 200, { message: 'Cart updated.' })
})

exports.updateCartItem = asyncHandler(async (req, res) => {
  const { productId, qty } = req.body

  const cart = await Cart.findOne({ userId: req.user._id })
  if (!cart) throw new AppError('Cart not found.', 404)

  if (qty <= 0) {
    cart.items = cart.items.filter(i => i.productId.toString() !== productId)
  } else {
    const item = cart.items.find(i => i.productId.toString() === productId)
    if (!item) throw new AppError('Item not in cart.', 404)
    item.qty = qty
  }

  if (cart.items.length === 0) cart.shopId = undefined
  await cart.save()
  sendSuccess(res, { cart }, 200, { message: 'Cart updated.' })
})

exports.clearCart = asyncHandler(async (req, res) => {
  await Cart.findOneAndUpdate({ userId: req.user._id }, { items: [], shopId: undefined })
  sendSuccess(res, null, 200, { message: 'Cart cleared.' })
})

// ─────────────────────────────────────────────────────────
//  ORDERS
// ─────────────────────────────────────────────────────────
exports.placeOrder = asyncHandler(async (req, res) => {
  const { deliveryAddress, paymentMethod, notes } = req.body

  const cart = await Cart.findOne({ userId: req.user._id })
    .populate('items.productId', 'name price mrp unit image stock isActive')

  if (!cart || cart.items.length === 0) throw new AppError('Your cart is empty.', 400)

  const shop = await Shop.findById(cart.shopId)
  if (!shop || shop.status !== 'approved') throw new AppError('Shop is not available.', 400)
  if (!shop.isOpen) throw new AppError('Shop is currently closed.', 400)

  const orderItems = []
  let subtotal = 0

  for (const cartItem of cart.items) {
    const p = cartItem.productId
    if (!p.isActive)            throw new AppError(`${p.name} is no longer available.`, 400)
    if (p.stock < cartItem.qty) throw new AppError(`Insufficient stock for ${p.name}.`, 400)

    const lineTotal = p.price * cartItem.qty
    subtotal += lineTotal
    orderItems.push({
      productId: p._id,
      name:      p.name,
      image:     p.image,
      price:     p.price,
      mrp:       p.mrp,
      unit:      p.unit,
      qty:       cartItem.qty,
      subtotal:  lineTotal,
    })
  }

  if (subtotal < (shop.minOrderAmount || 0))
    throw new AppError(`Minimum order amount is ₹${shop.minOrderAmount}.`, 400)

  const deliveryFee = subtotal >= (shop.freeDeliveryAbove ?? Infinity) ? 0 : (shop.deliveryFee ?? 0)
  const total       = subtotal + deliveryFee

  // Parse and validate coordinates if provided
  const lat = parseFloat(deliveryAddress.lat)
  const lng = parseFloat(deliveryAddress.lng)
  const hasValidCoords = !isNaN(lat) && !isNaN(lng)
                      && lat >= -90  && lat <= 90
                      && lng >= -180 && lng <= 180

  const order = await Order.create({
    shopId: shop._id,
    userId: req.user._id,
    items:  orderItems,
    subtotal,
    deliveryFee,
    total,
    deliveryAddress: {
      fullAddress: deliveryAddress.fullAddress,
      landmark:    deliveryAddress.landmark  || undefined,
      label:       deliveryAddress.label     || 'Home',
      // Only embed GeoJSON Point when coordinates are valid
      ...(hasValidCoords && {
        location: {
          type:        'Point',
          coordinates: [lng, lat],   // GeoJSON is [lng, lat]
        },
      }),
    },
    paymentMethod: paymentMethod || 'cash',
    notes:         notes         || undefined,
  })

  await Cart.findOneAndUpdate(
    { userId: req.user._id },
    { items: [], shopId: undefined }
  )

  await Notification.create({
    userId: shop.ownerId,
    type:   'order_update',
    title:  `New Order #${order.orderNumber}`,
    body:   `${orderItems.length} item(s) · ₹${total}`,
    data:   { orderId: order._id },
  })

  sendSuccess(res, { order }, 201, { message: 'Order placed successfully!' })
})


exports.getMyOrders = asyncHandler(async (req, res) => {
  console.log('req.user._id',req.user._id);
  
  const features = new APIFeatures(
    Order.find({ userId: req.user._id })
      .populate('shopId', 'name coverImage category')
      .populate('deliveryPersonId', 'name phone'),
    req.query
  )
    .filter()
    .sort('-createdAt')
    .paginate(10)

    console.log('features',features);
    

  const [orders, total] = await Promise.all([
    features.query,
    Order.countDocuments({ userId: req.user._id }),
  ])

  console.log('orders',orders);
  

  sendSuccess(res, {
    orders,
    total,
    page:  features._page,
    limit: features._limit,
  })
})

exports.getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, userId: req.user._id })
    .populate('shopId', 'name coverImage address phone category')
    .populate('deliveryPersonId', 'name phone avatar')

  if (!order) throw new AppError('Order not found.', 404)
  sendSuccess(res, { order })
})

exports.cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({
    _id:    req.params.id,
    userId: req.user._id,
    status: { $in: ['pending', 'confirmed'] },
  })

  if (!order) throw new AppError('Order cannot be cancelled (not found or already processing).', 400)

  order.cancelReason = req.body.reason || 'Cancelled by user'
  await order.advanceStatus('cancelled', order.cancelReason, req.user._id)

  // Restore stock if it was deducted
  if (order.status === 'confirmed') {
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.qty, totalSold: -item.qty } })
    }
  }

  sendSuccess(res, { order }, 200, { message: 'Order cancelled.' })
})

// ─────────────────────────────────────────────────────────
//  REVIEWS
// ─────────────────────────────────────────────────────────
exports.createReview = asyncHandler(async (req, res) => {
  const { shopId, rating, comment, orderId } = req.body

  // Verify the user actually ordered from this shop
  if (orderId) {
    const order = await Order.findOne({ _id: orderId, userId: req.user._id, shopId, status: 'delivered' })
    if (!order) throw new AppError('You can only review shops you have ordered from.', 403)
    if (order.isReviewed) throw new AppError('You have already reviewed this order.', 409)
    order.isReviewed = true
    await order.save()
  }

  const review = await Review.create({ shopId, userId: req.user._id, orderId, rating, comment })
  sendSuccess(res, { review }, 201, { message: 'Review submitted. Thank you!' })
})

exports.getShopReviews = asyncHandler(async (req, res) => {
  const features = new APIFeatures(
    Review.find({ shopId: req.params.shopId, isHidden: false })
      .populate('userId', 'name avatar'),
    req.query
  )
    .sort('-createdAt')
    .paginate(10)

  const [reviews, total] = await Promise.all([
    features.query,
    Review.countDocuments({ shopId: req.params.shopId, isHidden: false }),
  ])
  sendSuccess(res, { reviews }, 200, { total, page: features._page, limit: features._limit })
})

// ─────────────────────────────────────────────────────────
//  NOTIFICATIONS
// ─────────────────────────────────────────────────────────
exports.getNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ userId: req.user._id })
    .sort('-createdAt')
    .limit(30)

  const unreadCount = await Notification.countDocuments({ userId: req.user._id, isRead: false })
  sendSuccess(res, { notifications, unreadCount })
})

exports.markNotificationsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { userId: req.user._id, isRead: false },
    { isRead: true, readAt: new Date() }
  )
  sendSuccess(res, null, 200, { message: 'All notifications marked as read.' })
})
