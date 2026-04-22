const mongoose = require('mongoose')
const bcrypt   = require('bcryptjs')

const ROLES = ['admin', 'shopkeeper', 'delivery', 'stock', 'cashier', 'manager', 'user']

const userSchema = new mongoose.Schema(
  {
    name: {
      type:     String,
      required: [true, 'Name is required'],
      trim:     true,
      maxlength:[60, 'Name cannot exceed 60 characters'],
    },

    email: {
      type:      String,
      required:  [true, 'Email is required'],
      unique:    true,
      lowercase: true,
      trim:      true,
      match:     [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },

    phone: {
      type:  String,
      trim:  true,
      match: [/^[+]?[\d\s\-()]{7,15}$/, 'Invalid phone number'],
    },

    password: {
      type:      String,
      required:  [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select:    false,
    },

    role: {
      type:    String,
      enum:    ROLES,
      default: 'user',
    },

    // Sub-users belong to a shop
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'Shop',
    },

    avatar:   { type: String },
    address:  { type: String, trim: true },

    location: {
      type:        { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },  // [lng, lat]
    },

    isActive:       { type: Boolean, default: true  },
    isVerified:     { type: Boolean, default: false },
    isSuspended:    { type: Boolean, default: false },

    // FCM token for push notifications
    fcmToken:       { type: String },

    // Password reset
    passwordResetToken:   { type: String },
    passwordResetExpires: { type: Date   },

    lastLogin:      { type: Date },
    loginCount:     { type: Number, default: 0 },
  },
  {
    timestamps:       true,
    toJSON:           { virtuals: true },
    toObject:         { virtuals: true },
  }
)

// ── Indexes ────────────────────────────────────────────────
// Note: email index is created automatically by `unique: true` above
userSchema.index({ role: 1 })
userSchema.index({ shopId: 1 })
userSchema.index({ location: '2dsphere' })

// ── Hash password before save ──────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  const rounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12
  this.password = await bcrypt.hash(this.password, rounds)
  next()
})

// ── Instance: compare password ─────────────────────────────
userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password)
}

// ── Instance: safe user object ─────────────────────────────
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject()
  delete obj.password
  delete obj.passwordResetToken
  delete obj.passwordResetExpires
  return obj
}

// ── Virtual: full name initials ────────────────────────────
userSchema.virtual('initials').get(function () {
  return this.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'
})

module.exports = mongoose.model('User', userSchema)
