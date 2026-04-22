const mongoose = require('mongoose')

// ── Cart ───────────────────────────────────────────────────
const cartItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  qty:       { type: Number, required: true, min: 1 },
  price:     { type: Number, required: true },  // snapshot
}, { _id: false })

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      unique:   true,
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'Shop',
    },
    items: [cartItemSchema],
  },
  { timestamps: true, toJSON: { virtuals: true } }
)

cartSchema.virtual('total').get(function () {
  return this.items.reduce((s, i) => s + i.price * i.qty, 0)
})

cartSchema.virtual('itemCount').get(function () {
  return this.items.reduce((s, i) => s + i.qty, 0)
})

const Cart = mongoose.model('Cart', cartSchema)

// ── Notification ───────────────────────────────────────────
const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['order_update', 'shop_approved', 'shop_rejected', 'low_stock', 'new_review', 'promo', 'system'],
      required: true,
    },
    title:   { type: String, required: true },
    body:    { type: String },
    data:    { type: mongoose.Schema.Types.Mixed },  // extra payload
    isRead:  { type: Boolean, default: false },
    readAt:  { type: Date },
  },
  { timestamps: true }
)

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 })

const Notification = mongoose.model('Notification', notificationSchema)

module.exports = { Cart, Notification }
