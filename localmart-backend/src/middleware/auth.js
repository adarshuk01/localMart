const { verifyToken }   = require('../utils/jwtUtils')
const { AppError, asyncHandler } = require('../utils/AppError')
const User = require('../models/User')

// ── protect — verify JWT, attach req.user ─────────────────
const protect = asyncHandler(async (req, res, next) => {
  let token

  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1]
  } else if (req.cookies?.token) {
    token = req.cookies.token
  }

  if (!token) throw new AppError('Not authenticated. Please log in.', 401)

  const decoded = verifyToken(token)
  const user    = await User.findById(decoded.id).select('+password')

  if (!user)            throw new AppError('User no longer exists.', 401)
  if (user.isSuspended) throw new AppError('Your account has been suspended. Contact support.', 403)
  if (!user.isActive)   throw new AppError('Your account is inactive.', 403)

  req.user = user
  next()
})

// ── restrictTo — role-based access control ────────────────
const restrictTo = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(new AppError(`Access denied. Requires one of: ${roles.join(', ')}`, 403))
  }
  next()
}

// ── shopOwner — ensure user owns the shop ─────────────────
const shopOwner = asyncHandler(async (req, res, next) => {
  const Shop = require('../models/Shop')
  const shopId = req.params.shopId || req.params.id

  const shop = await Shop.findById(shopId)
  if (!shop) throw new AppError('Shop not found.', 404)

  const isOwner = shop.ownerId.toString() === req.user._id.toString()
  const isAdmin  = req.user.role === 'admin'

  if (!isOwner && !isAdmin) throw new AppError('You do not own this shop.', 403)

  req.shop = shop
  next()
})

// ── shopMember — owner or sub-user of the shop ────────────
const shopMember = asyncHandler(async (req, res, next) => {
  const Shop = require('../models/Shop')
  const shopId = req.params.shopId || req.user.shopId

  const shop = await Shop.findById(shopId)
  if (!shop) throw new AppError('Shop not found.', 404)

  const isOwner  = shop.ownerId.toString() === req.user._id.toString()
  const isMember = req.user.shopId?.toString() === shopId?.toString()
  const isAdmin  = req.user.role === 'admin'

  if (!isOwner && !isMember && !isAdmin)
    throw new AppError('You are not a member of this shop.', 403)

  req.shop = shop
  next()
})

// ── optionalAuth — attach user if token present ───────────
const optionalAuth = asyncHandler(async (req, _res, next) => {
  let token
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1]
  } else if (req.cookies?.token) {
    token = req.cookies.token
  }
  if (token) {
    try {
      const decoded = verifyToken(token)
      req.user = await User.findById(decoded.id)
    } catch {}
  }
  next()
})

module.exports = { protect, restrictTo, shopOwner, shopMember, optionalAuth }
