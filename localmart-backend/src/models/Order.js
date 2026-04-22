const mongoose = require('mongoose')

const ORDER_STATUSES  = ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled', 'refunded']
const PAYMENT_METHODS = ['UPI', 'card', 'cash', 'wallet', 'netbanking']
const PAYMENT_STATUSES= ['pending', 'paid', 'failed', 'refunded']

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref:  'Product',
    required: true,
  },
  name:      { type: String, required: true },   // snapshot at order time
  image:     { type: String },
  price:     { type: Number, required: true },    // snapshot
  mrp:       { type: Number },
  unit:      { type: String },
  qty:       { type: Number, required: true, min: 1 },
  subtotal:  { type: Number, required: true },    // price × qty
}, { _id: false })

const statusHistorySchema = new mongoose.Schema({
  status:    { type: String, enum: ORDER_STATUSES },
  note:      { type: String },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  at:        { type: Date, default: Date.now },
}, { _id: false })

const orderSchema = new mongoose.Schema(
  {
    // ── Reference ─────────────────────────────────────────
    orderNumber: {
      type:   String,
      unique: true,
    },

    shopId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Shop',
      required: [true, 'Shop is required'],
    },

    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'User is required'],
    },

    deliveryPersonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'User',
    },

    // ── Items ─────────────────────────────────────────────
    items:    { type: [orderItemSchema], required: true },

    // ── Pricing ───────────────────────────────────────────
    subtotal:    { type: Number, required: true },
    deliveryFee: { type: Number, default: 0     },
    discount:    { type: Number, default: 0     },
    tax:         { type: Number, default: 0     },
    total:       { type: Number, required: true },

    // ── Delivery address ──────────────────────────────────
    deliveryAddress: {
      fullAddress: { type: String, required: true },
      location: {
        type:        { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number] },   // [lng, lat]
      },
      landmark: String,
      label:    { type: String, default: 'Home' },
    },

    // ── Payment ───────────────────────────────────────────
    paymentMethod: {
      type:    String,
      enum:    PAYMENT_METHODS,
      default: 'cash',
    },
    paymentStatus: {
      type:    String,
      enum:    PAYMENT_STATUSES,
      default: 'pending',
    },
    transactionId: { type: String },
    paidAt:        { type: Date },

    // ── Status ────────────────────────────────────────────
    status: {
      type:    String,
      enum:    ORDER_STATUSES,
      default: 'pending',
    },
    statusHistory: [statusHistorySchema],

    // ── Timestamps ────────────────────────────────────────
    confirmedAt:   { type: Date },
    preparedAt:    { type: Date },
    pickedUpAt:    { type: Date },
    deliveredAt:   { type: Date },
    cancelledAt:   { type: Date },

    cancelReason:  { type: String },

    // ── Special instructions ──────────────────────────────
    notes: { type: String, maxlength: 300 },

    // ── OTP for delivery confirmation ─────────────────────
    deliveryOtp:    { type: String },
    isOtpVerified:  { type: Boolean, default: false },

    // ── Review ────────────────────────────────────────────
    isReviewed: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true },
  }
)

// ── Indexes ────────────────────────────────────────────────
orderSchema.index({ shopId: 1, status: 1, createdAt: -1 })
orderSchema.index({ userId: 1, createdAt: -1 })
orderSchema.index({ deliveryPersonId: 1, status: 1 })
orderSchema.index({ orderNumber: 1 })

// ── Auto-generate order number ─────────────────────────────
orderSchema.pre('save', async function (next) {
  if (this.isNew) {
    const count  = await this.constructor.countDocuments()
    this.orderNumber = `LM-${String(count + 1).padStart(6, '0')}`

    // Generate 4-digit delivery OTP
    this.deliveryOtp = String(Math.floor(1000 + Math.random() * 9000))

    // Initial status history
    this.statusHistory = [{ status: 'pending', at: new Date() }]
  }
  next()
})

// ── Method: advance status ─────────────────────────────────
orderSchema.methods.advanceStatus = async function (newStatus, note, changedBy) {
  this.status = newStatus
  this.statusHistory.push({ status: newStatus, note, changedBy, at: new Date() })

  const now = new Date()
  if (newStatus === 'confirmed')        this.confirmedAt  = now
  if (newStatus === 'preparing')        this.preparedAt   = now
  if (newStatus === 'out_for_delivery') this.pickedUpAt   = now
  if (newStatus === 'delivered')        this.deliveredAt  = now
  if (newStatus === 'cancelled')        this.cancelledAt  = now

  await this.save()
}

// ── Virtual: duration (minutes) ───────────────────────────
orderSchema.virtual('durationMinutes').get(function () {
  if (!this.deliveredAt || !this.createdAt) return null
  return Math.round((this.deliveredAt - this.createdAt) / 60000)
})

module.exports = mongoose.model('Order', orderSchema)
