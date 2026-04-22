const User                          = require('../../models/User')
const { asyncHandler, AppError }    = require('../../utils/AppError')
const { sendTokenResponse }         = require('../../utils/jwtUtils')
const { avatarImageProcessor }      = require('../../utils/fileUpload')
const logger                        = require('../../utils/logger')

// ── POST /api/auth/register ────────────────────────────────
exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, role } = req.body

  // Only admin can create admin/sub-user accounts via this flow
  const allowedRoles = ['user', 'shopkeeper']
  const assignedRole = allowedRoles.includes(role) ? role : 'user'

  const user = await User.create({ name, email, password, phone, role: assignedRole })

  logger.info(`New user registered: ${email} [${assignedRole}]`)
  sendTokenResponse(user, 201, res, 'Account created successfully.')
})

// ── POST /api/auth/login ───────────────────────────────────
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) throw new AppError('Email and password are required.', 400)

  const user = await User.findOne({ email }).select('+password')
  if (!user || !(await user.comparePassword(password)))
    throw new AppError('Invalid email or password.', 401)

  if (user.isSuspended) throw new AppError('Account suspended. Contact support.', 403)
  if (!user.isActive)   throw new AppError('Account is inactive.', 403)

  // Update last login
  user.lastLogin  = new Date()
  user.loginCount = (user.loginCount || 0) + 1
  await user.save({ validateBeforeSave: false })

  logger.info(`Login: ${email} [${user.role}]`)
  sendTokenResponse(user, 200, res, 'Login successful.')
})

// ── POST /api/auth/logout ──────────────────────────────────
exports.logout = (_req, res) => {
  res
    .cookie('token', 'none', { expires: new Date(Date.now() + 10 * 1000), httpOnly: true })
    .status(200)
    .json({ success: true, message: 'Logged out successfully.' })
}

// ── GET /api/auth/me ───────────────────────────────────────
exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('shopId', 'name slug status')
  res.status(200).json({ success: true, data: { user } })
})

// ── PUT /api/auth/update-profile ───────────────────────────
exports.updateProfile = asyncHandler(async (req, res) => {
  const allowed = ['name', 'phone', 'address', 'fcmToken']
  const updates = {}
  allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f] })

  // Handle location update
  if (req.body.lat && req.body.lng) {
    updates.location = {
      type:        'Point',
      coordinates: [parseFloat(req.body.lng), parseFloat(req.body.lat)],
    }
  }

  // Handle avatar upload
  if (req.file) {
    const url = await avatarImageProcessor(req.file.buffer, req.user._id)
    updates.avatar = url
  }

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new:            true,
    runValidators:  true,
  })

  res.status(200).json({ success: true, message: 'Profile updated.', data: { user } })
})

// ── PUT /api/auth/change-password ─────────────────────────
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body
  if (!currentPassword || !newPassword)
    throw new AppError('Both currentPassword and newPassword are required.', 400)

  const user = await User.findById(req.user._id).select('+password')
  if (!(await user.comparePassword(currentPassword)))
    throw new AppError('Current password is incorrect.', 401)

  if (newPassword.length < 8)
    throw new AppError('New password must be at least 8 characters.', 400)

  user.password = newPassword
  await user.save()

  sendTokenResponse(user, 200, res, 'Password changed successfully.')
})
